#!/bin/bash

# Script para implantar as correções do formato da resposta da API

set -e

echo "=== Implantando correções do formato da resposta da API ==="

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

# Obter informações do cluster GKE
echo "Obtendo informações do cluster GKE..."
CLUSTERS=$(gcloud container clusters list --format="value(name)")
if [ -z "$CLUSTERS" ]; then
  echo "❌ Nenhum cluster GKE encontrado no projeto $PROJECT."
  exit 1
fi

# Se houver mais de um cluster, use o primeiro
CLUSTER_NAME=$(echo "$CLUSTERS" | head -n 1)
CLUSTER_LOCATION=$(gcloud container clusters list --filter="name=$CLUSTER_NAME" --format="value(location)")
echo "✅ Usando cluster: $CLUSTER_NAME em $CLUSTER_LOCATION"

# Construir a imagem do container com a plataforma específica
echo "Construindo a imagem do container com a plataforma específica..."
cd gamgui-app/gamgui-server
docker build --platform linux/amd64 -t gcr.io/$PROJECT/gamgui-server-image:api-response-fix .
echo "✅ Imagem construída com sucesso."

# Enviar a imagem para o Container Registry
echo "Enviando a imagem para o Container Registry..."
docker push gcr.io/$PROJECT/gamgui-server-image:api-response-fix
echo "✅ Imagem enviada com sucesso."

# Atualizar o serviço Cloud Run para usar a nova imagem
echo "Atualizando o serviço Cloud Run para usar a nova imagem..."
cd ../..
gcloud run services update gamgui-server \
  --region=us-central1 \
  --project=$PROJECT \
  --image=gcr.io/$PROJECT/gamgui-server-image:api-response-fix \
  --update-env-vars="GKE_CLUSTER_NAME=$CLUSTER_NAME,GKE_CLUSTER_LOCATION=$CLUSTER_LOCATION,PROJECT_ID=$PROJECT"

echo "=== Implantação concluída ==="
echo "Agora o Cloud Run deve estar usando a versão corrigida do formato da resposta da API."
echo "Teste novamente a criação de sessões."
