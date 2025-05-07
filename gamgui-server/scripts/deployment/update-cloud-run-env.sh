#!/bin/bash
# Script para atualizar as variáveis de ambiente do servidor Cloud Run

set -e

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Atualizando variáveis de ambiente do servidor Cloud Run ===${NC}"

# Configuração
PROJECT_ID="gamgui-registry"
REGION="us-central1"
SERVICE_NAME="gamgui-server"
GKE_CLUSTER_NAME="gamgui-cluster"
GKE_CLUSTER_LOCATION="us-central1"
K8S_NAMESPACE="gamgui"
K8S_SERVICE_ACCOUNT="gam-service-account"
WEBSOCKET_ENABLED="true"
WEBSOCKET_PROXY_URL="34.68.78.87"
WEBSOCKET_SESSION_CONNECTION_TEMPLATE="ws://34.68.78.87/ws/session/{{SESSION_ID}}/"
WEBSOCKET_SESSION_PATH_TEMPLATE="/ws/session/{{SESSION_ID}}/"
EXTERNAL_WEBSOCKET_URL_TEMPLATE="wss://gamgui-server-vthtec4m3a-uc.a.run.app/api/sessions/{{SESSION_ID}}/ws"

# Verificar se o gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Erro: gcloud não está instalado${NC}"
    exit 1
fi

# Verificar se o usuário está logado no gcloud
echo -e "${YELLOW}Verificando autenticação do gcloud...${NC}"
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
    echo -e "${RED}Erro: Não está logado no gcloud${NC}"
    echo "Por favor, execute 'gcloud auth login' primeiro"
    exit 1
fi
echo -e "${GREEN}Autenticado como: $ACCOUNT${NC}"

# Verificar se o projeto está configurado
echo -e "${YELLOW}Verificando configuração do projeto...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Configurando projeto para: $PROJECT_ID${NC}"
    gcloud config set project $PROJECT_ID
fi
echo -e "${GREEN}Usando projeto: $PROJECT_ID${NC}"

# Atualizar as variáveis de ambiente do servidor Cloud Run
echo -e "${YELLOW}Atualizando variáveis de ambiente do servidor Cloud Run...${NC}"
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --set-env-vars="PROJECT_ID=$PROJECT_ID,GKE_CLUSTER_NAME=$GKE_CLUSTER_NAME,GKE_CLUSTER_LOCATION=$GKE_CLUSTER_LOCATION,K8S_NAMESPACE=$K8S_NAMESPACE,K8S_SERVICE_ACCOUNT=$K8S_SERVICE_ACCOUNT,WEBSOCKET_ENABLED=$WEBSOCKET_ENABLED,WEBSOCKET_PROXY_URL=$WEBSOCKET_PROXY_URL,WEBSOCKET_SESSION_CONNECTION_TEMPLATE=$WEBSOCKET_SESSION_CONNECTION_TEMPLATE,WEBSOCKET_SESSION_PATH_TEMPLATE=$WEBSOCKET_SESSION_PATH_TEMPLATE,EXTERNAL_WEBSOCKET_URL_TEMPLATE=$EXTERNAL_WEBSOCKET_URL_TEMPLATE"

echo -e "${GREEN}=== Variáveis de ambiente atualizadas com sucesso ===${NC}"
echo -e "${YELLOW}Reiniciando o servidor Cloud Run...${NC}"

# Forçar uma nova implantação para reiniciar o servidor
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --no-cpu-throttling \
    --min-instances=1 \
    --max-instances=1

echo -e "${GREEN}=== Servidor Cloud Run reiniciado com sucesso ===${NC}"
echo -e "${YELLOW}URL do servidor: $(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')${NC}"
