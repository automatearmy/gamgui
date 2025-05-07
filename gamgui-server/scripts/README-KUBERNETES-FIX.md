# Correção do Adaptador Kubernetes

Este diretório contém scripts para corrigir e testar o adaptador Kubernetes após a reorganização do código.

## Problema

Após a reorganização do código, os comandos GAM pararam de funcionar na interface do usuário. O erro ocorria durante a criação de sessões, com o seguinte erro:

```
POST https://gamgui-server-vthtec4m3a-uc.a.run.app/api/sessions 500 (Internal Server Error)
Failed to initialize session: Error: Error creating container: HTTP request failed
```

Além disso, durante a implantação no Cloud Run, ocorreu o seguinte erro:

```
ERROR: Cloud Run does not support image 'gcr.io/gamgui-registry/gamgui-server:latest': Container manifest type 'application/vnd.oci.image.index.v1+json' must support amd64/linux.
```

## Solução

A solução envolve:

1. **Correção dos caminhos de importação** no adaptador Kubernetes para refletir a nova estrutura de diretórios.

2. **Simplificação das importações** para usar a abordagem padrão do Node.js em vez de caminhos complexos.

3. **Especificação da plataforma correta** ao construir a imagem Docker para garantir compatibilidade com o Cloud Run (adicionando a flag `--platform=linux/amd64` ao comando `docker build`).

4. **Implantação das alterações** no servidor Cloud Run usando scripts automatizados.

## Scripts Disponíveis

### 1. Script de Implantação

**Caminho:** `gamgui-server/scripts/deployment/deploy-fixed-adapter.sh`

Este script implanta as alterações no adaptador Kubernetes no servidor Cloud Run.

**Como usar:**

```bash
# Navegue para o diretório do script
cd gamgui-server/scripts/deployment

# Torne o script executável (se ainda não estiver)
chmod +x deploy-fixed-adapter.sh

# Execute o script
./deploy-fixed-adapter.sh
```

**O que o script faz:**

1. Verifica se os arquivos necessários existem e foram atualizados corretamente.
2. Verifica se as credenciais do Google Cloud estão configuradas.
3. Constrói uma nova imagem Docker do servidor com a plataforma correta (`--platform=linux/amd64`).
4. Envia a imagem para o Container Registry.
5. Implanta a nova versão no Cloud Run.

### 2. Script de Teste

**Caminho:** `gamgui-server/scripts/diagnostics/test-kubernetes-adapter-fix.js`

Este script testa se a correção do adaptador Kubernetes funcionou, criando uma sessão e executando um comando GAM.

**Como usar:**

```bash
# Navegue para o diretório do script
cd gamgui-server/scripts/diagnostics

# Instale as dependências necessárias (se ainda não estiverem instaladas)
npm install axios uuid

# Execute o script
node test-kubernetes-adapter-fix.js
```

**O que o script faz:**

1. Cria uma nova sessão.
2. Aguarda 10 segundos para a sessão ser inicializada.
3. Executa um comando GAM simples (`info domain`).
4. Exclui a sessão.
5. Relata se o teste foi bem-sucedido ou não.

## Documentação Adicional

Para mais informações sobre a correção do adaptador Kubernetes, consulte o documento `docs/KUBERNETES_ADAPTER_FIX.md`.

## Solução de Problemas

Se você encontrar problemas ao executar os scripts, verifique o seguinte:

1. **Permissões:** Certifique-se de que os scripts têm permissões de execução.
2. **Credenciais do Google Cloud:** Certifique-se de que você está autenticado no Google Cloud e que o projeto correto está configurado.
3. **Docker:** Certifique-se de que o Docker está instalado e em execução.
4. **Dependências:** Certifique-se de que todas as dependências necessárias estão instaladas.
5. **Plataforma Docker:** Se você encontrar erros relacionados à plataforma da imagem Docker, verifique se a flag `--platform=linux/amd64` está sendo usada no comando `docker build`. Isso é especialmente importante se você estiver usando um Mac com chip M1/M2, que usa a arquitetura arm64 por padrão.

## Contato

Se você tiver dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.
