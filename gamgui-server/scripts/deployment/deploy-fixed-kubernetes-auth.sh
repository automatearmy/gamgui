#!/bin/bash

# Script para reimplantar o servidor com as correções de autenticação do Kubernetes
# Este script aplica as permissões do Kubernetes e reimplanta o servidor Cloud Run

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Reimplantando o servidor com as correções de autenticação do Kubernetes ===${NC}"

# Configuração
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
K8S_NAMESPACE=${K8S_NAMESPACE:-"gamgui"}

echo "Configuração atual:"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "GKE Cluster Name: ${GKE_CLUSTER_NAME}"
echo "GKE Cluster Location: ${GKE_CLUSTER_LOCATION}"
echo "Kubernetes Namespace: ${K8S_NAMESPACE}"

# Verificar se o gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Erro: gcloud não está instalado${NC}"
  exit 1
fi

# Verificar se o kubectl está instalado
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Erro: kubectl não está instalado${NC}"
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

# Verificar se o cluster GKE existe
echo -e "${YELLOW}Verificando se o cluster GKE ${GKE_CLUSTER_NAME} existe...${NC}"
if ! gcloud container clusters describe ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Erro: O cluster GKE ${GKE_CLUSTER_NAME} não existe no projeto ${PROJECT_ID}, região ${GKE_CLUSTER_LOCATION}${NC}"
  exit 1
fi

# Aplicar as permissões do Kubernetes
echo -e "${YELLOW}Aplicando as permissões do Kubernetes...${NC}"
$(dirname "$0")/fix-kubernetes-permissions.sh

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao aplicar as permissões do Kubernetes${NC}"
  exit 1
fi

# Construir e implantar o servidor
echo -e "${YELLOW}Construindo e implantando o servidor...${NC}"

# Navegar para o diretório do servidor
cd $(dirname "$0")/../../

# Construir a imagem Docker
echo -e "${YELLOW}Construindo a imagem Docker...${NC}"
docker build --platform=linux/amd64 -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao construir a imagem Docker${NC}"
  exit 1
fi

# Enviar a imagem para o Container Registry
echo -e "${YELLOW}Enviando a imagem para o Container Registry...${NC}"
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao enviar a imagem para o Container Registry${NC}"
  exit 1
fi

# Configurar variáveis de ambiente para o Cloud Run
MAX_SESSIONS=${MAX_SESSIONS:-20}
MAX_SESSION_AGE_HOURS=${MAX_SESSION_AGE_HOURS:-24}

echo -e "${YELLOW}Configuração de sessões:${NC}"
echo "MAX_SESSIONS: ${MAX_SESSIONS}"
echo "MAX_SESSION_AGE_HOURS: ${MAX_SESSION_AGE_HOURS}"

# Implantar o servidor no Cloud Run
echo -e "${YELLOW}Implantando o servidor no Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --update-env-vars "CLOUD_RUN_REVISION=true,GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME},GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION},PROJECT_ID=${PROJECT_ID},K8S_NAMESPACE=${K8S_NAMESPACE},WEBSOCKET_ENABLED=true,WEBSOCKET_PROXY_SERVICE_URL=websocket-proxy.gamgui.svc.cluster.local,WEBSOCKET_SESSION_CONNECTION_TEMPLATE=ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/,WEBSOCKET_SESSION_PATH_TEMPLATE=/ws/session/{{SESSION_ID}}/,WEBSOCKET_MAX_SESSIONS=50,EXTERNAL_WEBSOCKET_URL_TEMPLATE=wss://api.gamgui.example.com/ws/session/{{SESSION_ID}}/,MAX_SESSIONS=${MAX_SESSIONS},MAX_SESSION_AGE_HOURS=${MAX_SESSION_AGE_HOURS}" \
  --memory 512Mi \
  --cpu 1 \
  --port 3001

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao implantar o servidor no Cloud Run${NC}"
  exit 1
fi

# Obter a URL do serviço
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(status.url)")

echo -e "${GREEN}=== Reimplantação concluída com sucesso ===${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo -e "${YELLOW}Aguarde alguns minutos para que as alterações sejam propagadas${NC}"
echo -e "${YELLOW}Você pode verificar o status do serviço em: ${SERVICE_URL}${NC}"
