#!/bin/bash

# Script para atualizar as variáveis de ambiente do Cloud Run relacionadas ao Kubernetes
# Este script atualiza as variáveis de ambiente necessárias para a conexão com o cluster GKE

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Atualizando variáveis de ambiente do Cloud Run para Kubernetes ===${NC}"

# Configuração
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
K8S_NAMESPACE=${K8S_NAMESPACE:-"gamgui"}
TARGET_PROJECT_ID=${TARGET_PROJECT_ID:-"gamgui-tf-1"} # Projeto para onde o Kubernetes será movido

echo "Configuração atual:"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "GKE Cluster Name: ${GKE_CLUSTER_NAME}"
echo "GKE Cluster Location: ${GKE_CLUSTER_LOCATION}"
echo "Kubernetes Namespace: ${K8S_NAMESPACE}"
echo "Target Project ID: ${TARGET_PROJECT_ID}"

# Verificar se o gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Erro: gcloud não está instalado${NC}"
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

# Verificar se o cluster GKE existe no projeto alvo
echo -e "${YELLOW}Verificando se o cluster GKE ${GKE_CLUSTER_NAME} existe no projeto ${TARGET_PROJECT_ID}...${NC}"
if ! gcloud container clusters describe ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${TARGET_PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Erro: O cluster GKE ${GKE_CLUSTER_NAME} não existe no projeto ${TARGET_PROJECT_ID}, região ${GKE_CLUSTER_LOCATION}${NC}"
  echo -e "${YELLOW}Verificando se o cluster existe no projeto atual (${PROJECT_ID})...${NC}"
  
  if ! gcloud container clusters describe ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${PROJECT_ID} &> /dev/null; then
    echo -e "${RED}Erro: O cluster GKE ${GKE_CLUSTER_NAME} não existe no projeto atual (${PROJECT_ID}) nem no projeto alvo (${TARGET_PROJECT_ID})${NC}"
    exit 1
  else
    echo -e "${YELLOW}O cluster GKE ${GKE_CLUSTER_NAME} existe no projeto atual (${PROJECT_ID})${NC}"
    echo -e "${YELLOW}Continuando com o projeto atual...${NC}"
    TARGET_PROJECT_ID=${PROJECT_ID}
  fi
else
  echo -e "${GREEN}O cluster GKE ${GKE_CLUSTER_NAME} existe no projeto alvo (${TARGET_PROJECT_ID})${NC}"
fi

# Obter as variáveis de ambiente atuais
echo -e "${YELLOW}Obtendo variáveis de ambiente atuais...${NC}"
CURRENT_ENV=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(spec.template.spec.containers[0].env)" 2>/dev/null)

if [[ -z "${CURRENT_ENV}" ]]; then
  echo -e "${YELLOW}Nenhuma variável de ambiente encontrada${NC}"
  CURRENT_ENV_VARS=""
else
  echo -e "${GREEN}Variáveis de ambiente atuais obtidas${NC}"
  CURRENT_ENV_VARS=$(echo "${CURRENT_ENV}" | grep -v "GKE_CLUSTER_NAME\|GKE_CLUSTER_LOCATION\|PROJECT_ID\|K8S_NAMESPACE\|CLOUD_RUN_REVISION" | tr '\n' ',')
  
  if [[ -n "${CURRENT_ENV_VARS}" && "${CURRENT_ENV_VARS}" != *,$ ]]; then
    CURRENT_ENV_VARS="${CURRENT_ENV_VARS},"
  fi
fi

# Construir a string de variáveis de ambiente
ENV_VARS="${CURRENT_ENV_VARS}GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME},GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION},PROJECT_ID=${TARGET_PROJECT_ID},K8S_NAMESPACE=${K8S_NAMESPACE},CLOUD_RUN_REVISION=true"

echo -e "${YELLOW}Novas variáveis de ambiente:${NC}"
echo "${ENV_VARS}" | tr ',' '\n'

# Atualizar as variáveis de ambiente
echo -e "${YELLOW}Atualizando variáveis de ambiente...${NC}"
gcloud run services update ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --set-env-vars "${ENV_VARS}"

if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}Variáveis de ambiente atualizadas com sucesso${NC}"
else
  echo -e "${RED}Erro ao atualizar variáveis de ambiente${NC}"
  exit 1
fi

# Obter a URL do serviço
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(status.url)")

echo -e "${GREEN}=== Atualização concluída ===${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo -e "${YELLOW}Aguarde alguns minutos para que as alterações sejam propagadas${NC}"
echo -e "${YELLOW}Você pode verificar o status do serviço em: ${SERVICE_URL}${NC}"
