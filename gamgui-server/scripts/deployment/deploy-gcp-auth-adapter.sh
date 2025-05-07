#!/bin/bash

# Script para implantar a versão do KubernetesAdapter com autenticação GCP direta
# Versão 2.0 - Corrigido o problema de token de acesso

set -e

echo "=== Implantando KubernetesAdapter com autenticação GCP direta (v2.0) ==="
echo "Esta versão corrige o problema de obtenção do token de acesso GCP"

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

# Fazer backup do arquivo original
echo "Fazendo backup do arquivo original para gamgui-app/gamgui-server/services/container/KubernetesAdapter.js.bak2..."
cp gamgui-app/gamgui-server/services/container/KubernetesAdapter.js gamgui-app/gamgui-server/services/container/KubernetesAdapter.js.bak2

# Copiar o novo arquivo
echo "Copiando arquivo corrigido para gamgui-app/gamgui-server/services/container/KubernetesAdapter.js..."
cp KubernetesAdapter-gcp-auth.js gamgui-app/gamgui-server/services/container/KubernetesAdapter.js

# Instalar dependências
echo "Instalando dependências..."
cd gamgui-app/gamgui-server
npm install google-auth-library --save
cd ../..

# Atualizar as variáveis de ambiente do Cloud Run
echo "Atualizando variáveis de ambiente do Cloud Run..."
gcloud run services update gamgui-server \
  --region=us-central1 \
  --update-env-vars="GKE_CLUSTER_NAME=$CLUSTER_NAME,GKE_CLUSTER_LOCATION=$CLUSTER_LOCATION,PROJECT_ID=$PROJECT"

# Construir e implantar o servidor
echo "Construindo e implantando o servidor..."
cd gamgui-app
./build-and-push-server.sh
cd ..

echo "=== Implantação concluída ==="
echo "URL do servidor: https://gamgui-server-vthtec4m3a-uc.a.run.app"
echo "Variáveis de ambiente configuradas:"
echo "  GKE_CLUSTER_NAME: $CLUSTER_NAME"
echo "  GKE_CLUSTER_LOCATION: $CLUSTER_LOCATION"
echo "  PROJECT_ID: $PROJECT"
