#!/bin/bash

# Script para corrigir o problema de autenticação do Cloud Run com o GKE
# Este script configura as permissões necessárias para que o Cloud Run possa acessar o cluster GKE

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Corrigindo autenticação do Cloud Run com o GKE ===${NC}"

# Configuração
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
TARGET_PROJECT_ID=${TARGET_PROJECT_ID:-"gamgui-tf1-edu"} # Projeto para onde o Kubernetes será movido

echo "Configuração atual:"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "GKE Cluster Name: ${GKE_CLUSTER_NAME}"
echo "GKE Cluster Location: ${GKE_CLUSTER_LOCATION}"
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

# Obter a conta de serviço do Cloud Run
echo -e "${YELLOW}Obtendo a conta de serviço do Cloud Run...${NC}"
SERVICE_ACCOUNT=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(spec.template.spec.serviceAccountName)")

if [[ -z "${SERVICE_ACCOUNT}" ]]; then
  echo -e "${YELLOW}Nenhuma conta de serviço específica configurada para o Cloud Run. Usando a conta de serviço padrão...${NC}"
  SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"
else
  echo -e "${GREEN}Conta de serviço do Cloud Run: ${SERVICE_ACCOUNT}${NC}"
fi

# Verificar se a conta de serviço existe
echo -e "${YELLOW}Verificando se a conta de serviço ${SERVICE_ACCOUNT} existe...${NC}"
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT} --project ${PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Erro: A conta de serviço ${SERVICE_ACCOUNT} não existe no projeto ${PROJECT_ID}${NC}"
  
  # Verificar se é a conta de serviço padrão
  if [[ "${SERVICE_ACCOUNT}" == "${PROJECT_ID}@appspot.gserviceaccount.com" ]]; then
    echo -e "${YELLOW}A conta de serviço padrão não existe. Criando...${NC}"
    gcloud iam service-accounts create ${PROJECT_ID} --display-name="Default App Engine service account" --project ${PROJECT_ID}
    
    if [[ $? -ne 0 ]]; then
      echo -e "${RED}Erro ao criar a conta de serviço padrão${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}Criando a conta de serviço ${SERVICE_ACCOUNT}...${NC}"
    
    # Extrair o nome da conta de serviço
    SA_NAME=$(echo ${SERVICE_ACCOUNT} | cut -d '@' -f 1)
    
    gcloud iam service-accounts create ${SA_NAME} --display-name="Cloud Run service account" --project ${PROJECT_ID}
    
    if [[ $? -ne 0 ]]; then
      echo -e "${RED}Erro ao criar a conta de serviço ${SERVICE_ACCOUNT}${NC}"
      exit 1
    fi
  fi
else
  echo -e "${GREEN}A conta de serviço ${SERVICE_ACCOUNT} existe${NC}"
fi

# Conceder permissões para a conta de serviço acessar o cluster GKE
echo -e "${YELLOW}Concedendo permissões para a conta de serviço ${SERVICE_ACCOUNT} acessar o cluster GKE...${NC}"

# Conceder papel de administrador do Kubernetes
echo -e "${YELLOW}Concedendo papel de administrador do Kubernetes...${NC}"
gcloud projects add-iam-policy-binding ${TARGET_PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/container.admin"

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao conceder papel de administrador do Kubernetes${NC}"
  exit 1
fi

# Conceder papel de usuário do Kubernetes
echo -e "${YELLOW}Concedendo papel de usuário do Kubernetes...${NC}"
gcloud projects add-iam-policy-binding ${TARGET_PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/container.developer"

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao conceder papel de usuário do Kubernetes${NC}"
  exit 1
fi

# Conceder papel de visualizador do Kubernetes
echo -e "${YELLOW}Concedendo papel de visualizador do Kubernetes...${NC}"
gcloud projects add-iam-policy-binding ${TARGET_PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/container.viewer"

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao conceder papel de visualizador do Kubernetes${NC}"
  exit 1
fi

# Conceder papel de usuário do Secret Manager
echo -e "${YELLOW}Concedendo papel de usuário do Secret Manager...${NC}"
gcloud projects add-iam-policy-binding ${TARGET_PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao conceder papel de usuário do Secret Manager${NC}"
  exit 1
fi

# Atualizar a conta de serviço do Cloud Run
echo -e "${YELLOW}Atualizando a conta de serviço do Cloud Run...${NC}"
gcloud run services update ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --service-account ${SERVICE_ACCOUNT}

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao atualizar a conta de serviço do Cloud Run${NC}"
  exit 1
fi

echo -e "${GREEN}=== Autenticação do Cloud Run com o GKE corrigida com sucesso ===${NC}"
echo -e "${YELLOW}Aguarde alguns minutos para que as alterações sejam propagadas${NC}"
