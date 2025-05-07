#!/bin/bash

# Script para implantar a versão corrigida do KubernetesAdapter que usa google-auth-library

set -e

echo "=== Implantando versão corrigida do KubernetesAdapter com google-auth-library ==="

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

# Copiar o arquivo KubernetesAdapter-cloud-run.js para o diretório do projeto
echo "Copiando KubernetesAdapter-cloud-run.js para o diretório do projeto..."
mkdir -p gamgui-app/gamgui-server/services/container/backup
cp gamgui-app/gamgui-server/services/container/KubernetesAdapter.js gamgui-app/gamgui-server/services/container/backup/KubernetesAdapter.js.bak
cp KubernetesAdapter-cloud-run.js gamgui-app/gamgui-server/services/container/KubernetesAdapter.js
echo "✅ Arquivo copiado com sucesso."

# Verificar se a dependência google-auth-library está instalada
echo "Verificando dependência google-auth-library..."
cd gamgui-app/gamgui-server
if ! grep -q "google-auth-library" package.json; then
  echo "Instalando dependência google-auth-library..."
  npm install --save google-auth-library
  echo "✅ Dependência instalada com sucesso."
else
  echo "✅ Dependência google-auth-library já está instalada."
fi

# Construir a imagem do container com a plataforma específica
echo "Construindo a imagem do container com a plataforma específica..."
docker build --platform linux/amd64 -t gcr.io/$PROJECT/gamgui-server-image:cloud-run-adapter .
echo "✅ Imagem construída com sucesso."

# Enviar a imagem para o Container Registry
echo "Enviando a imagem para o Container Registry..."
docker push gcr.io/$PROJECT/gamgui-server-image:cloud-run-adapter
echo "✅ Imagem enviada com sucesso."

# Atualizar o serviço Cloud Run para usar a nova imagem
echo "Atualizando o serviço Cloud Run para usar a nova imagem..."
cd ../..
gcloud run services update gamgui-server \
  --region=us-central1 \
  --project=$PROJECT \
  --image=gcr.io/$PROJECT/gamgui-server-image:cloud-run-adapter \
  --update-env-vars="GKE_CLUSTER_NAME=$CLUSTER_NAME,GKE_CLUSTER_LOCATION=$CLUSTER_LOCATION,PROJECT_ID=$PROJECT"

echo "=== Implantação concluída ==="
echo "Agora o Cloud Run deve estar usando a versão corrigida do KubernetesAdapter com google-auth-library."
echo "Teste novamente a criação de sessões."
