#!/bin/bash

# Script para corrigir o problema da imagem do container no Cloud Run

set -e

echo "=== Corrigindo problema da imagem do container no Cloud Run ==="

# Verificar autenticação do gcloud
echo "Verificando autenticação do gcloud..."
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
if [ -z "$ACCOUNT" ]; then
  echo "❌ Não há conta gcloud autenticada. Execute 'gcloud auth login' primeiro."
  exit 1
fi
echo "✅ Autenticado como: $ACCOUNT"

# Verificar configuração do projeto
echo "Verificando configuração do projeto..."
PROJECT=$(gcloud config get-value project)
if [ -z "$PROJECT" ]; then
  echo "❌ Nenhum projeto configurado. Execute 'gcloud config set project PROJECT_ID' primeiro."
  exit 1
fi
echo "✅ Usando projeto: $PROJECT"

# Obter a revisão atual do Cloud Run
echo "Obtendo a revisão atual do Cloud Run..."
CURRENT_REVISION=$(gcloud run services describe gamgui-server --region=us-central1 --project=$PROJECT --format="value(status.traffic[0].revisionName)")
echo "✅ Revisão atual: $CURRENT_REVISION"

# Construir a imagem do container com a plataforma específica
echo "Construindo a imagem do container com a plataforma específica..."
cd gamgui-app/gamgui-server
docker build --platform linux/amd64 -t gcr.io/$PROJECT/gamgui-server-image:amd64 .
echo "✅ Imagem construída com sucesso."

# Enviar a imagem para o Container Registry
echo "Enviando a imagem para o Container Registry..."
docker push gcr.io/$PROJECT/gamgui-server-image:amd64
echo "✅ Imagem enviada com sucesso."

# Atualizar o serviço Cloud Run para usar a nova imagem
echo "Atualizando o serviço Cloud Run para usar a nova imagem..."
gcloud run services update gamgui-server \
  --region=us-central1 \
  --project=$PROJECT \
  --image=gcr.io/$PROJECT/gamgui-server-image:amd64

echo "=== Correção concluída ==="
echo "Agora o Cloud Run deve estar usando uma imagem de container compatível."
echo "Teste novamente a criação de sessões."
