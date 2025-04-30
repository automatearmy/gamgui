#!/bin/bash

# Script para verificar e corrigir as permissões do Cloud Run para acessar o cluster GKE

set -e

echo "=== Verificando e corrigindo permissões do Cloud Run para GKE ==="

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

# Obter a conta de serviço do Cloud Run
echo "Obtendo conta de serviço do Cloud Run..."
SERVICE_ACCOUNT=$(gcloud run services describe gamgui-server --region=us-central1 --project=$PROJECT --format="value(spec.template.spec.serviceAccountName)")
if [ -z "$SERVICE_ACCOUNT" ]; then
  echo "❌ Não foi possível obter a conta de serviço do Cloud Run."
  exit 1
fi
echo "✅ Conta de serviço do Cloud Run: $SERVICE_ACCOUNT"

# Verificar se a conta de serviço já tem o papel de visualizador de cluster
echo "Verificando permissões atuais da conta de serviço..."
HAS_CLUSTER_VIEWER=$(gcloud projects get-iam-policy $PROJECT --format="json(bindings)" | grep -A 10 "roles/container.clusterViewer" | grep -c "$SERVICE_ACCOUNT" || true)
HAS_CLUSTER_ADMIN=$(gcloud projects get-iam-policy $PROJECT --format="json(bindings)" | grep -A 10 "roles/container.admin" | grep -c "$SERVICE_ACCOUNT" || true)
HAS_CONTAINER_DEVELOPER=$(gcloud projects get-iam-policy $PROJECT --format="json(bindings)" | grep -A 10 "roles/container.developer" | grep -c "$SERVICE_ACCOUNT" || true)

# Adicionar papéis necessários
echo "Adicionando papéis necessários à conta de serviço..."

# Adicionar papel de visualizador de cluster se não tiver
if [ "$HAS_CLUSTER_VIEWER" -eq "0" ]; then
  echo "Adicionando papel de visualizador de cluster (container.clusterViewer)..."
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/container.clusterViewer"
else
  echo "✅ A conta de serviço já tem o papel de visualizador de cluster."
fi

# Adicionar papel de desenvolvedor de container se não tiver
if [ "$HAS_CONTAINER_DEVELOPER" -eq "0" ]; then
  echo "Adicionando papel de desenvolvedor de container (container.developer)..."
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/container.developer"
else
  echo "✅ A conta de serviço já tem o papel de desenvolvedor de container."
fi

# Adicionar papel de administrador de cluster se não tiver (pode ser necessário para algumas operações)
if [ "$HAS_CLUSTER_ADMIN" -eq "0" ]; then
  echo "Adicionando papel de administrador de cluster (container.admin)..."
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/container.admin"
else
  echo "✅ A conta de serviço já tem o papel de administrador de cluster."
fi

# Verificar se a conta de serviço tem permissão para usar a API do Kubernetes
echo "Verificando se a conta de serviço tem permissão para usar a API do Kubernetes..."
gcloud container clusters get-credentials $CLUSTER_NAME --region=$CLUSTER_LOCATION --project=$PROJECT

# Criar um ClusterRoleBinding para a conta de serviço
echo "Criando ClusterRoleBinding para a conta de serviço..."
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cloud-run-gke-access
subjects:
- kind: User
  name: $SERVICE_ACCOUNT
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
EOF

# Reiniciar o serviço Cloud Run para aplicar as alterações
echo "Reiniciando o serviço Cloud Run para aplicar as alterações..."
gcloud run services update gamgui-server --region=us-central1 --project=$PROJECT --no-traffic

# Restaurar o tráfego para o serviço Cloud Run
echo "Restaurando o tráfego para o serviço Cloud Run..."
gcloud run services update-traffic gamgui-server --region=us-central1 --project=$PROJECT --to-latest

echo "=== Permissões corrigidas com sucesso ==="
echo "Agora o Cloud Run deve ter as permissões necessárias para acessar o cluster GKE."
echo "Teste novamente a criação de sessões."
