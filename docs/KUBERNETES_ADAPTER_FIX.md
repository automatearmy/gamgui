# Correção do Adaptador Kubernetes para Cloud Run

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

## Causa Raiz

Durante a reorganização do código, os arquivos do adaptador Kubernetes foram movidos para o diretório `gamgui-app/gamgui-server/services/container/adapters/`, mas o arquivo `ContainerFactory.js` continuou importando o adaptador do local antigo (`./KubernetesAdapter`).

Além disso, os caminhos de importação dentro do arquivo `KubernetesAdapter-cloud-run.js` estavam incorretos, usando uma abordagem complexa com `require(require('path').resolve(__dirname, '../../../node_modules/...'))` que não funcionava corretamente após a movimentação dos arquivos.

## Solução

1. **Atualização do ContainerFactory.js**:
   - Alterado o caminho de importação do KubernetesAdapter para apontar para o novo local:
     ```javascript
     const KubernetesAdapter = require('./adapters/KubernetesAdapter-cloud-run');
     ```

2. **Correção dos caminhos de importação no KubernetesAdapter-cloud-run.js**:
   - Simplificados os caminhos de importação para usar a abordagem padrão do Node.js:
     ```javascript
     const k8s = require('@kubernetes/client-node');
     const fs = require('fs');
     const path = require('path');
     const { GoogleAuth } = require('google-auth-library');
     const ContainerService = require('../ContainerService');
     const { ContainerError } = require('../../../utils/errorHandler');
     const https = require('https');
     ```
   - Corrigido o caminho de importação do Writable:
     ```javascript
     const { Writable } = require('stream');
     ```
   - Corrigido o caminho de importação do KubernetesWebSocketAdapter na documentação:
     ```javascript
     * @param {import('../KubernetesWebSocketAdapter')} [websocketAdapter=null] - WebSocket adapter
     ```

3. **Implantação das alterações**:
   - Criado um script `gamgui-server/scripts/deployment/deploy-fixed-adapter.sh` para implantar as alterações no servidor Cloud Run.
   - O script inclui verificações robustas para garantir que todos os pré-requisitos sejam atendidos antes da implantação.
   - O script detecta automaticamente o projeto do Google Cloud e configura os caminhos corretos independentemente de onde é executado.

4. **Correção da plataforma Docker**:
   - Adicionada a flag `--platform=linux/amd64` ao comando `docker build` nos scripts de implantação para garantir compatibilidade com o Cloud Run:
     ```bash
     docker build --platform=linux/amd64 -t gcr.io/${PROJECT_ID}/gamgui-server:latest .
     ```
   - Esta correção resolve o erro de incompatibilidade de arquitetura que ocorria durante a implantação no Cloud Run.

## Verificação

Após a implantação das alterações, a criação de sessões na interface do usuário voltou a funcionar corretamente. Os comandos GAM agora são executados com sucesso nos contêineres Kubernetes.

## Lições Aprendidas

1. **Caminhos de Importação**: Ao reorganizar o código, é importante atualizar todos os caminhos de importação para refletir a nova estrutura de diretórios.

2. **Simplificação de Importações**: É melhor usar a abordagem padrão do Node.js para importações (`require('module')`) em vez de abordagens complexas com resolução de caminhos.

3. **Testes Após Reorganização**: Após reorganizar o código, é importante testar todas as funcionalidades principais para garantir que tudo continue funcionando corretamente.

4. **Backup**: Manter um backup dos arquivos originais é crucial para poder restaurar rapidamente em caso de problemas.

5. **Compatibilidade de Plataforma**: Ao construir imagens Docker para serviços em nuvem como o Cloud Run, é importante especificar a plataforma correta (`--platform=linux/amd64`) para garantir compatibilidade, especialmente quando se desenvolve em máquinas com arquiteturas diferentes (como Macs com chips M1/M2).

## Próximos Passos

1. **Monitoramento**: Monitorar o servidor para garantir que não haja outros problemas relacionados à reorganização do código.

2. **Documentação**: Atualizar a documentação do projeto para refletir a nova estrutura de diretórios.

3. **Testes Automatizados**: Implementar testes automatizados para detectar problemas semelhantes no futuro.
