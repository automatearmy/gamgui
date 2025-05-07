#!/bin/bash

# Script para limpar sessões antigas e reiniciar o servidor
# Este script executa a limpeza de sessões antigas e reinicia o servidor Cloud Run

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Limpando sessões antigas e reiniciando o servidor ===${NC}"

# Configuração
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
MAX_SESSION_AGE_HOURS=${MAX_SESSION_AGE_HOURS:-24}
DRY_RUN=${DRY_RUN:-false}

echo "Configuração atual:"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "MAX_SESSION_AGE_HOURS: ${MAX_SESSION_AGE_HOURS}"
echo "DRY_RUN: ${DRY_RUN}"

# Verificar se o gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Erro: gcloud não está instalado${NC}"
  exit 1
fi

# Verificar se o node está instalado
if ! command -v node &> /dev/null; then
  echo -e "${RED}Erro: Node.js não está instalado${NC}"
  exit 1
fi

# Verificar se o usuário está autenticado no gcloud
if ! gcloud auth print-access-token &> /dev/null; then
  echo -e "${RED}Erro: Você não está autenticado no gcloud${NC}"
  echo -e "${YELLOW}Execute 'gcloud auth login' para autenticar-se${NC}"
  exit 1
fi

# Verificar se o projeto está configurado
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ -z "${CURRENT_PROJECT}" ]]; then
  echo -e "${RED}Erro: Nenhum projeto do Google Cloud configurado${NC}"
  echo -e "${YELLOW}Execute 'gcloud config set project ${PROJECT_ID}' para configurar o projeto${NC}"
  exit 1
fi

if [[ "${CURRENT_PROJECT}" != "${PROJECT_ID}" ]]; then
  echo -e "${YELLOW}Aviso: O projeto atual (${CURRENT_PROJECT}) é diferente do projeto especificado (${PROJECT_ID})${NC}"
  read -p "Deseja continuar? (s/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}Operação cancelada pelo usuário${NC}"
    exit 1
  fi
fi

# Verificar se o serviço existe
echo -e "${YELLOW}Verificando se o serviço ${SERVICE_NAME} existe...${NC}"
if ! gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Erro: O serviço ${SERVICE_NAME} não existe no projeto ${PROJECT_ID}, região ${REGION}${NC}"
  exit 1
fi

# Obter o diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"

# Executar a limpeza de sessões antigas
echo -e "${YELLOW}Executando a limpeza de sessões antigas...${NC}"
export MAX_SESSION_AGE_HOURS
export DRY_RUN
node "$PROJECT_ROOT/scripts/maintenance/cleanup-old-sessions.js"

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao executar a limpeza de sessões antigas${NC}"
  exit 1
fi

# Perguntar se o usuário deseja reiniciar o servidor
echo -e "${YELLOW}Deseja reiniciar o servidor Cloud Run? (s/n)${NC}"
read -p "" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo -e "${YELLOW}Reinicialização do servidor cancelada pelo usuário${NC}"
  exit 0
fi

# Reiniciar o servidor Cloud Run
echo -e "${YELLOW}Reiniciando o servidor Cloud Run...${NC}"
gcloud run services update ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --clear-revision-tags

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao reiniciar o servidor Cloud Run${NC}"
  exit 1
fi

echo -e "${GREEN}=== Limpeza de sessões antigas e reinicialização do servidor concluídas com sucesso ===${NC}"
echo -e "${YELLOW}Aguarde alguns minutos para que as alterações sejam propagadas${NC}"
