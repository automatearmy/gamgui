# Kubernetes Volume Mount Fix

## Problema

Identificamos um problema crítico na configuração de montagem de volumes nos pods Kubernetes para sessões GAM. Os pods estavam falhando ao iniciar com o seguinte erro:

```
Error: failed to create containerd task: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: error mounting "/var/lib/kubelet/pods/.../volume-subpaths/gam-config/gam-container/2" to rootfs at "/root/.gam/gam.cfg": mount /var/lib/kubelet/pods/.../volume-subpaths/gam-config/gam-container/2:/root/.gam/gam.cfg (via /proc/self/fd/6), flags: 0x5001: not a directory: unknown
```

O problema ocorria porque a configuração de montagem de volumes estava tentando montar:

1. O secret `gam-credentials` em `/root/.gam`
2. O ConfigMap `gam-config` em `/root/.gam/gam.cfg`

Isso criava um conflito, pois não é possível montar um arquivo em um caminho que já está montado como diretório.

## Solução

A solução implementada modifica a configuração de montagem de volumes para:

1. Montar o secret `gam-credentials` em `/root/.gam/credentials` em vez de `/root/.gam`
2. Remover a montagem do ConfigMap `gam-config`
3. Criar o arquivo `gam.cfg` diretamente no contêiner usando um script bash

### Arquivos Modificados

1. `gamgui-server/services/container/KubernetesAdapter.js`
   - Atualizado para usar a nova configuração de montagem de volumes
   - Adicionado script para criar o arquivo `gam.cfg` e copiar as credenciais para o local correto

2. `gamgui-server/utils/kubernetesClient.js`
   - Atualizado para usar a nova configuração de montagem de volumes
   - Adicionado script para criar o arquivo `gam.cfg` e copiar as credenciais para o local correto

3. `gamgui-terraform/scripts/manage-websocket-sessions.sh`
   - Atualizado para usar a nova configuração de montagem de volumes

## Implementação

A implementação foi feita em três etapas:

1. Criar versões corrigidas dos arquivos afetados
2. Criar um script de implantação para atualizar os arquivos no servidor
3. Implantar o servidor com as correções

### Configuração de Montagem de Volumes Antiga

```javascript
volumeMounts: [
  {
    name: 'gam-credentials',
    mountPath: '/root/.gam'
  },
  {
    name: 'gam-uploads',
    mountPath: '/gam/uploads'
  },
  {
    name: 'gam-config',
    mountPath: '/root/.gam/gam.cfg',
    subPath: 'gam.cfg'
  }
]
```

### Configuração de Montagem de Volumes Nova

```javascript
volumeMounts: [
  {
    name: 'gam-credentials',
    mountPath: '/root/.gam/credentials',
    readOnly: true
  },
  {
    name: 'gam-uploads',
    mountPath: '/gam/uploads'
  }
]
```

### Script para Criar o Arquivo gam.cfg

```bash
# Create GAM config directory
mkdir -p /root/.gam

# Create a new gam.cfg file with correct paths
cat > /root/.gam/gam.cfg << GAMCFG
[DEFAULT]
customer_id = my_customer
domain = automatearmy.com
oauth2_txt = /root/.gam/oauth2.txt
oauth2service_json = /root/.gam/oauth2service.json
client_secrets_json = /root/.gam/client_secrets.json
GAMCFG

# Copy credentials to the expected location
cp /root/.gam/credentials/oauth2.txt /root/.gam/oauth2.txt
cp /root/.gam/credentials/oauth2service.json /root/.gam/oauth2service.json
cp /root/.gam/credentials/client_secrets.json /root/.gam/client_secrets.json
```

## Verificação

Para verificar se a correção foi aplicada corretamente, crie uma nova sessão e verifique se o pod inicia corretamente:

```bash
# Criar uma nova sessão
curl -X POST -H "Content-Type: application/json" -d '{"name":"test-session"}' https://gamgui-server-vthtec4m3a-uc.a.run.app/api/sessions

# Verificar o status do pod
kubectl get pods -n gamgui | grep <session-id>
```

Se o pod estiver em estado "Running", a correção foi aplicada com sucesso.

## Limpeza Automática de Sessões

O sistema possui dois cronjobs para limpar sessões inativas:

1. `cleanup-inactive-sessions` - executa a cada 5 minutos
2. `session-cleanup` - executa a cada 10 minutos

Esses jobs verificam a anotação `last_activity` nos deployments e removem sessões inativas após 1 hora de inatividade.

## Conclusão

A correção do problema de montagem de volumes nos pods Kubernetes para sessões GAM permite que as sessões sejam criadas e executadas corretamente. Isso melhora a estabilidade e confiabilidade do sistema.
