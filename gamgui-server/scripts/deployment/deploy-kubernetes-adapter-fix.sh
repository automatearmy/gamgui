#!/bin/bash
# Script para implantar a correção do KubernetesAdapter no servidor Cloud Run

set -e

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Implantando correção do KubernetesAdapter no servidor Cloud Run ===${NC}"

# Configuração
PROJECT_ID="gamgui-registry"
REGION="us-central1"
SERVICE_NAME="gamgui-server"
SERVER_DIR="gamgui-app/gamgui-server"
ADAPTER_PATH="services/container/KubernetesAdapter.js"
FIX_PATH="KubernetesAdapter-fix.js"

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

# Verificar se os arquivos existem
if [ ! -f "$FIX_PATH" ]; then
    echo -e "${RED}Erro: Arquivo de correção $FIX_PATH não encontrado${NC}"
    exit 1
fi

if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}Erro: Diretório do servidor $SERVER_DIR não encontrado${NC}"
    exit 1
fi

# Criar diretório de destino se não existir
TARGET_DIR="$SERVER_DIR/services/container"
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}Criando diretório $TARGET_DIR...${NC}"
    mkdir -p "$TARGET_DIR"
fi

# Fazer backup do arquivo original
BACKUP_PATH="$TARGET_DIR/KubernetesAdapter.js.bak"
if [ -f "$TARGET_DIR/KubernetesAdapter.js" ]; then
    echo -e "${YELLOW}Fazendo backup do arquivo original para $BACKUP_PATH...${NC}"
    cp "$TARGET_DIR/KubernetesAdapter.js" "$BACKUP_PATH"
fi

# Copiar o arquivo corrigido
echo -e "${YELLOW}Copiando arquivo corrigido para $TARGET_DIR/KubernetesAdapter.js...${NC}"
cp "$FIX_PATH" "$TARGET_DIR/KubernetesAdapter.js"

# Navegar para o diretório do servidor
cd "$SERVER_DIR"

# Construir e implantar o servidor
echo -e "${YELLOW}Construindo e implantando o servidor...${NC}"
./deploy-cloud-run.sh

echo -e "${GREEN}=== Correção implantada com sucesso ===${NC}"
echo -e "${YELLOW}URL do servidor: $(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')${NC}"
