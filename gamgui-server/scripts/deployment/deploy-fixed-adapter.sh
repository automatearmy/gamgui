#!/bin/bash

# Script para implantar as alterações no adaptador do Kubernetes no servidor Cloud Run
# Este script constrói e implanta uma nova versão do servidor com as alterações no adaptador

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Implantando alterações no adaptador do Kubernetes ===${NC}"

# Verificar se estamos no diretório correto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ROOT_DIR="$(cd "${SERVER_DIR}/.." && pwd)"

echo -e "${YELLOW}Diretório do script: ${SCRIPT_DIR}${NC}"
echo -e "${YELLOW}Diretório do servidor: ${SERVER_DIR}${NC}"
echo -e "${YELLOW}Diretório raiz: ${ROOT_DIR}${NC}"

# Navegar para o diretório do servidor
cd "${SERVER_DIR}" || {
  echo -e "${RED}Erro: Não foi possível navegar para o diretório do servidor${NC}"
  exit 1
}

# Verificar se o arquivo do adaptador existe
if [[ ! -f "services/container/adapters/KubernetesAdapter-cloud-run.js" ]]; then
  echo -e "${RED}Erro: O arquivo do adaptador não foi encontrado${NC}"
  echo -e "${RED}Caminho atual: $(pwd)${NC}"
  echo -e "${RED}Arquivos em services/container/adapters/:${NC}"
  ls -la services/container/adapters/ || echo "Diretório não encontrado"
  exit 1
fi

# Verificar se o arquivo ContainerFactory.js foi atualizado
if ! grep -q "adapters/KubernetesAdapter-cloud-run" services/container/ContainerFactory.js; then
  echo -e "${RED}Erro: O arquivo ContainerFactory.js não foi atualizado para usar o novo adaptador${NC}"
  echo -e "${YELLOW}Conteúdo atual de ContainerFactory.js:${NC}"
  grep -n "KubernetesAdapter" services/container/ContainerFactory.js
  exit 1
fi

# Verificar se temos as credenciais do Google Cloud configuradas
if ! gcloud auth print-access-token &>/dev/null; then
  echo -e "${RED}Erro: Não foi possível obter o token de acesso do Google Cloud${NC}"
  echo -e "${YELLOW}Execute 'gcloud auth login' para autenticar-se${NC}"
  exit 1
fi

# Verificar se o projeto do Google Cloud está configurado
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [[ -z "${PROJECT_ID}" ]]; then
  echo -e "${RED}Erro: Nenhum projeto do Google Cloud configurado${NC}"
  echo -e "${YELLOW}Execute 'gcloud config set project SEU_PROJETO' para configurar o projeto${NC}"
  exit 1
fi

echo -e "${GREEN}Projeto do Google Cloud: ${PROJECT_ID}${NC}"

# Construir e implantar o servidor
echo -e "${YELLOW}Construindo e implantando o servidor...${NC}"

# Executar o script de implantação
if [[ -f "deploy-cloud-run.sh" ]]; then
  echo -e "${YELLOW}Executando deploy-cloud-run.sh...${NC}"
  bash deploy-cloud-run.sh
else
  echo -e "${YELLOW}Script deploy-cloud-run.sh não encontrado, usando comandos diretos...${NC}"
  
  # Verificar se o Docker está instalado e em execução
  if ! docker info &>/dev/null; then
    echo -e "${RED}Erro: Docker não está em execução ou não está instalado${NC}"
    exit 1
  fi
  
  # Construir a imagem Docker com plataforma específica para Cloud Run
  echo -e "${YELLOW}Construindo a imagem Docker para plataforma linux/amd64...${NC}"
  docker build --platform=linux/amd64 -t gcr.io/${PROJECT_ID}/gamgui-server:latest .
  
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Erro ao construir a imagem Docker${NC}"
    exit 1
  fi
  
  # Enviar a imagem para o Container Registry
  echo -e "${YELLOW}Enviando a imagem para o Container Registry...${NC}"
  docker push gcr.io/${PROJECT_ID}/gamgui-server:latest
  
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Erro ao enviar a imagem para o Container Registry${NC}"
    exit 1
  fi
  
  # Implantar no Cloud Run
  echo -e "${YELLOW}Implantando no Cloud Run...${NC}"
  gcloud run deploy gamgui-server \
    --image gcr.io/${PROJECT_ID}/gamgui-server:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
fi

# Verificar se a implantação foi bem-sucedida
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}=== Implantação concluída com sucesso ===${NC}"
  echo -e "${GREEN}O servidor foi atualizado com as alterações no adaptador do Kubernetes${NC}"
  echo -e "${YELLOW}Aguarde alguns minutos para que as alterações sejam propagadas${NC}"
  
  # Obter a URL do serviço
  SERVICE_URL=$(gcloud run services describe gamgui-server --platform managed --region us-central1 --format='value(status.url)')
  echo -e "${GREEN}URL do serviço: ${SERVICE_URL}${NC}"
else
  echo -e "${RED}=== Erro na implantação ===${NC}"
  echo -e "${RED}Verifique os logs acima para mais detalhes${NC}"
  exit 1
fi

echo -e "${GREEN}=== Processo concluído ===${NC}"
