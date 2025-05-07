#!/bin/bash

# Script para corrigir as permissões do Kubernetes para a conta de serviço do Cloud Run
# Este script cria a conta de serviço no namespace gamgui e concede as permissões necessárias

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Corrigindo permissões do Kubernetes para a conta de serviço do Cloud Run ===${NC}"

# Configuração
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
K8S_NAMESPACE=${K8S_NAMESPACE:-"gamgui"}
SERVICE_ACCOUNT=${SERVICE_ACCOUNT:-"gamgui-server-sa"}

echo "Configuração atual:"
echo "Project ID: ${PROJECT_ID}"
echo "GKE Cluster Name: ${GKE_CLUSTER_NAME}"
echo "GKE Cluster Location: ${GKE_CLUSTER_LOCATION}"
echo "Kubernetes Namespace: ${K8S_NAMESPACE}"
echo "Service Account: ${SERVICE_ACCOUNT}"

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

# Verificar se o cluster GKE existe
echo -e "${YELLOW}Verificando se o cluster GKE ${GKE_CLUSTER_NAME} existe...${NC}"
if ! gcloud container clusters describe ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Erro: O cluster GKE ${GKE_CLUSTER_NAME} não existe no projeto ${PROJECT_ID}, região ${GKE_CLUSTER_LOCATION}${NC}"
  exit 1
fi

# Configurar o kubectl para acessar o cluster GKE
echo -e "${YELLOW}Configurando kubectl para acessar o cluster GKE...${NC}"
gcloud container clusters get-credentials ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${PROJECT_ID}

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao configurar kubectl para acessar o cluster GKE${NC}"
  exit 1
fi

# Verificar se o namespace existe
echo -e "${YELLOW}Verificando se o namespace ${K8S_NAMESPACE} existe...${NC}"
if ! kubectl get namespace ${K8S_NAMESPACE} &> /dev/null; then
  echo -e "${YELLOW}Namespace ${K8S_NAMESPACE} não existe. Criando...${NC}"
  kubectl create namespace ${K8S_NAMESPACE}
  
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Erro ao criar namespace ${K8S_NAMESPACE}${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}Namespace ${K8S_NAMESPACE} existe${NC}"
fi

# Verificar se a conta de serviço existe no namespace
echo -e "${YELLOW}Verificando se a conta de serviço ${SERVICE_ACCOUNT} existe no namespace ${K8S_NAMESPACE}...${NC}"
if ! kubectl get serviceaccount ${SERVICE_ACCOUNT} -n ${K8S_NAMESPACE} &> /dev/null; then
  echo -e "${YELLOW}Conta de serviço ${SERVICE_ACCOUNT} não existe no namespace ${K8S_NAMESPACE}. Criando...${NC}"
  
  # Aplicar o arquivo YAML da conta de serviço
  kubectl apply -f $(dirname "$0")/../../kubernetes/gamgui-server-sa.yaml
  
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Erro ao criar conta de serviço ${SERVICE_ACCOUNT} no namespace ${K8S_NAMESPACE}${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}Conta de serviço ${SERVICE_ACCOUNT} existe no namespace ${K8S_NAMESPACE}${NC}"
fi

# Aplicar o Role Binding
echo -e "${YELLOW}Aplicando Role Binding para a conta de serviço ${SERVICE_ACCOUNT}...${NC}"
kubectl apply -f $(dirname "$0")/../../kubernetes/gamgui-server-sa-role-binding.yaml

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Erro ao aplicar Role Binding para a conta de serviço ${SERVICE_ACCOUNT}${NC}"
  exit 1
fi

# Verificar se a conta de serviço agora tem permissões
echo -e "${YELLOW}Verificando se a conta de serviço ${SERVICE_ACCOUNT} tem permissões para criar pods...${NC}"
if kubectl auth can-i create pods --namespace=${K8S_NAMESPACE} --as=system:serviceaccount:${K8S_NAMESPACE}:${SERVICE_ACCOUNT} | grep -q "yes"; then
  echo -e "${GREEN}A conta de serviço ${SERVICE_ACCOUNT} tem permissões para criar pods no namespace ${K8S_NAMESPACE}${NC}"
else
  echo -e "${RED}A conta de serviço ${SERVICE_ACCOUNT} ainda não tem permissões para criar pods no namespace ${K8S_NAMESPACE}${NC}"
  echo -e "${YELLOW}Verifique se o Role Binding foi aplicado corretamente${NC}"
  exit 1
fi

echo -e "${GREEN}=== Permissões do Kubernetes corrigidas com sucesso ===${NC}"
echo -e "${YELLOW}Agora o Cloud Run deve ser capaz de criar pods no cluster GKE${NC}"
