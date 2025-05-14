# WebSocket Fix para Execução de Scripts Bash

Este documento descreve as alterações feitas para resolver o problema de execução de scripts bash no terminal da aplicação GAM.

## Problema

Quando um usuário tenta executar um script bash no terminal da aplicação GAM, a conexão WebSocket é fechada, resultando em:

```
$: > bash hellyeah.sh
Disconnected: transport close
Attempting to reconnect...
Error: Connection error: xhr poll error
```

Além disso, o console do navegador mostra erros de CORS e timeout na conexão WebSocket.

## Solução

Foram implementadas as seguintes alterações para resolver o problema:

1. **Melhoria na configuração CORS**:
   - Adicionado middleware CORS personalizado para garantir que os cabeçalhos CORS sejam adicionados corretamente
   - Configurado Socket.io para permitir todas as origens nas conexões WebSocket
   - Adicionado cabeçalho `Access-Control-Allow-Origin` a todas as respostas

2. **Aumento do timeout da conexão WebSocket**:
   - Aumentado o timeout da conexão WebSocket para 120 segundos
   - Aumentado o intervalo de ping para 25 segundos
   - Aumentado o timeout de conexão para 60 segundos

3. **Melhoria na execução de scripts bash**:
   - Modificado o método `executeBashScript` no `KubernetesAdapter` para executar o comando `chmod +x` e o script bash em comandos separados
   - Implementado tratamento de erros mais robusto para garantir que o script seja executado mesmo se o comando `chmod +x` falhar

## Arquivos Modificados

1. `server.js`: Atualizado para usar o middleware CORS personalizado e aumentar o timeout da conexão WebSocket
2. `middleware/cors.js`: Novo arquivo com middleware CORS personalizado
3. `services/container/KubernetesAdapter.js`: Modificado para melhorar a execução de scripts bash

## Como Implantar

Para implantar as alterações, execute o script `deploy-websocket-fix.sh`:

```bash
# Navegue até o diretório do script
cd gamgui-app/gamgui-server/scripts/deployment
./deploy-websocket-fix.sh
```

Ou, se você estiver na raiz do projeto:

```bash
./gamgui-app/gamgui-server/scripts/deployment/deploy-websocket-fix.sh
```

Este script simplificado irá:
1. Configurar o projeto GCP para `gamgui-tf-1`
2. Construir e enviar a imagem Docker do servidor usando o script `build-and-push-server.sh`
3. Aplicar as alterações do Terraform usando o script `apply-terraform.sh`

Nota: O script foi configurado para navegar corretamente entre os diretórios, independentemente de onde você o execute.

## Verificação

Após a implantação, verifique se a execução de scripts bash está funcionando corretamente:

1. Faça login na aplicação GAM
2. Crie uma nova sessão
3. Faça upload de um script bash
4. Execute o script usando o comando `bash nome_do_script.sh`

Se o script for executado sem desconectar o terminal, a correção foi bem-sucedida.

## Solução de Problemas

Se ainda houver problemas com a execução de scripts bash, verifique os logs do servidor para obter mais informações:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gamgui-server" --limit=50
```

Procure por erros relacionados a CORS, WebSocket ou execução de comandos.
