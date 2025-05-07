# Correção de Autenticação do Kubernetes no Cloud Run

## Problema

Após um período de funcionamento normal, o sistema começou a apresentar erros ao tentar criar sessões GAM. O erro específico era:

```
Error creating container: HTTP request failed
```

Nos logs do servidor, o erro detalhado era:

```
Error calling createNamespacedPod: {
  message: 'HTTP request failed',
  status: 401,
  reason: 'Unauthorized',
  details: {
    kind: 'Status',
    apiVersion: 'v1',
    metadata: {},
    status: 'Failure',
    message: 'Unauthorized',
    reason: 'Unauthorized',
    code: 401
  }
}
```

Este erro indica que o Cloud Run não tinha permissões para criar pods no cluster Kubernetes.

## Causa Raiz

A causa raiz do problema foi identificada como uma falha de autenticação entre o Cloud Run e o cluster GKE. Especificamente:

1. A conta de serviço do Cloud Run (`gamgui-server-sa@gamgui-registry.iam.gserviceaccount.com`) tinha as permissões IAM corretas no nível do projeto (`roles/container.admin`, `roles/container.developer`, etc.).

2. No entanto, a conta de serviço não tinha permissões no nível do namespace Kubernetes (`gamgui`). Isso foi confirmado com o comando:

   ```bash
   kubectl auth can-i create pods --namespace=gamgui --as=system:serviceaccount:gamgui:gamgui-server-sa
   ```

   Que retornou "no", indicando que a conta de serviço não tinha permissões para criar pods no namespace.

3. Além disso, o código não estava lidando adequadamente com falhas de autenticação, não implementava retry com backoff exponencial e não fornecia logs detalhados para diagnóstico.

## Solução

A solução implementada consiste em três partes:

### 1. Correção das Permissões do Kubernetes

Criamos um Role Binding no Kubernetes para dar à conta de serviço do Cloud Run as permissões necessárias no namespace `gamgui`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gamgui-server-sa-admin
  namespace: gamgui
subjects:
- kind: ServiceAccount
  name: gamgui-server-sa
  namespace: gamgui
roleRef:
  kind: ClusterRole
  name: admin
  apiGroup: rbac.authorization.k8s.io
```

Também criamos a conta de serviço no namespace `gamgui`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gamgui-server-sa
  namespace: gamgui
```

### 2. Renovação Automática de Token

Implementamos um mecanismo de renovação automática de token no adaptador Kubernetes:

1. Adicionamos um método `_scheduleTokenRefresh` que programa a renovação do token 5 minutos antes da expiração.
2. Implementamos um método `_refreshKubernetesToken` que renova o token e atualiza os clientes da API Kubernetes.
3. Criamos um wrapper `_withTokenRefresh` que detecta erros 401 (Unauthorized) e renova o token automaticamente.
4. Aplicamos o wrapper a todos os métodos que fazem chamadas à API Kubernetes.

### 3. Gerenciamento de Sessões

Implementamos mecanismos para gerenciar melhor as sessões:

1. **Limitação de Sessões Simultâneas**: Adicionamos um limite configurável de sessões ativas no `SessionService.js`.
2. **Limpeza Automática de Sessões**: Criamos scripts para limpar sessões antigas no Firestore.
   - `cleanup-old-sessions.js`: Script para excluir sessões mais antigas que um determinado período.
   - `schedule-cleanup.sh`: Script para agendar a limpeza periódica de sessões.

## Scripts de Correção

Criamos os seguintes scripts para corrigir o problema:

1. **Permissões do Kubernetes**:
   - `gamgui-server/scripts/deployment/fix-kubernetes-permissions.sh`: Aplica as permissões do Kubernetes para a conta de serviço do Cloud Run.
   - `gamgui-server/scripts/deployment/deploy-fixed-kubernetes-auth.sh`: Reimplanta o servidor com as correções de autenticação do Kubernetes.

2. **Gerenciamento de Sessões**:
   - `gamgui-server/scripts/maintenance/cleanup-old-sessions.js`: Script para limpar sessões antigas no Firestore.
   - `gamgui-server/scripts/maintenance/schedule-cleanup.sh`: Script para agendar a limpeza periódica de sessões.

## Como Aplicar a Correção

### 1. Corrigir Permissões e Reimplantar o Servidor

Para aplicar a correção de permissões e reimplantar o servidor, execute:

```bash
./gamgui-server/scripts/deployment/deploy-fixed-kubernetes-auth.sh
```

Este script fará o seguinte:

1. Verificar se o ambiente está configurado corretamente.
2. Aplicar as permissões do Kubernetes para a conta de serviço do Cloud Run.
3. Construir e implantar o servidor com as correções de autenticação.

### 2. Configurar Limpeza Automática de Sessões

Para configurar a limpeza automática de sessões, execute:

```bash
./gamgui-server/scripts/maintenance/schedule-cleanup.sh
```

Este script executará a limpeza imediatamente e fornecerá instruções para configurar um job cron para execução periódica.

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente ao seu serviço Cloud Run:

```
MAX_SESSIONS=20                # Limite máximo de sessões simultâneas
MAX_SESSION_AGE_HOURS=24       # Idade máxima das sessões em horas
```

## Prevenção de Problemas Futuros

Para evitar problemas semelhantes no futuro, implementamos:

1. **Renovação Automática de Token**: O sistema agora renova automaticamente os tokens antes que expirem.
2. **Retry com Backoff Exponencial**: Implementamos retry com backoff exponencial para lidar com falhas temporárias.
3. **Limitação de Sessões**: O sistema agora limita o número de sessões ativas para evitar sobrecarga.
4. **Limpeza Automática**: Sessões antigas são automaticamente limpas para evitar acúmulo.

Além disso, recomendamos:

1. **Monitoramento**: Implementar monitoramento para detectar falhas de autenticação rapidamente.
2. **Alertas**: Adicionar alertas para quando as permissões ou configurações forem alteradas.
3. **Documentação**: Manter documentação clara das permissões e configurações necessárias.
4. **Testes Periódicos**: Realizar testes periódicos de autenticação para garantir que as permissões estejam corretas.

## Lições Aprendidas

1. **Permissões em Múltiplos Níveis**: As permissões no Google Cloud Platform são aplicadas em múltiplos níveis (IAM do projeto, RBAC do Kubernetes, etc.). É importante verificar todos os níveis ao diagnosticar problemas de autenticação.

2. **Retry com Backoff Exponencial**: Implementar retry com backoff exponencial é essencial para lidar com falhas temporárias de autenticação.

3. **Logs Detalhados**: Logs detalhados são cruciais para diagnosticar problemas de autenticação.

4. **Verificação Proativa**: Verificar proativamente as permissões pode ajudar a detectar problemas antes que eles afetem os usuários.
