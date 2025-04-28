# Correção de Autenticação do kubectl no Cloud Run

## Problema

A interface web GAMGUI estava mostrando "Error joining session" ao tentar executar comandos. Após investigação, identificamos que o problema estava relacionado à conexão WebSocket entre o cliente e os pods do Kubernetes.

Os problemas específicos eram:

1. **Falta do kubectl no Cloud Run**: O servidor estava tentando criar sessões WebSocket usando um script que depende do kubectl, mas o kubectl não estava instalado no container do Cloud Run.

2. **Falta de autenticação do kubectl**: Mesmo após instalar o kubectl, ele não estava configurado para autenticar com o cluster GKE.

## Solução

Implementamos uma solução em três partes:

### 1. Instalação do kubectl e Google Cloud SDK

Atualizamos o Dockerfile para instalar o kubectl e o Google Cloud SDK:

```dockerfile
# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install Google Cloud SDK for authentication with GKE
RUN wget -O google-cloud-sdk.tar.gz https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-458.0.0-linux-x86_64.tar.gz && \
    tar -xzf google-cloud-sdk.tar.gz && \
    ./google-cloud-sdk/install.sh --quiet --usage-reporting=false --path-update=true && \
    rm google-cloud-sdk.tar.gz && \
    google-cloud-sdk/bin/gcloud components install gke-gcloud-auth-plugin --quiet && \
    google-cloud-sdk/bin/gcloud config set container/use_client_certificate False
```

### 2. Script de configuração do kubectl

Criamos um script `configure-kubectl.sh` que configura o kubectl para autenticar com o cluster GKE:

```bash
#!/bin/bash
# Script to configure kubectl to access the GKE cluster

# Get cluster information from environment variables
CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}

# Configure kubectl to use the GKE cluster
gcloud container clusters get-credentials ${CLUSTER_NAME} --region=${CLUSTER_LOCATION} --project=${PROJECT_ID}
```

### 3. Integração com o script de criação de sessão

Modificamos o script `create-websocket-session.sh` para chamar o script `configure-kubectl.sh` antes de executar os comandos kubectl:

```bash
# Configure kubectl to access the GKE cluster
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ -f "${SCRIPT_DIR}/configure-kubectl.sh" ]; then
  source "${SCRIPT_DIR}/configure-kubectl.sh"
else
  echo -e "${RED}Error: configure-kubectl.sh script not found${NC}"
  exit 1
fi
```

## Configuração do Cloud Run

Também garantimos que o Cloud Run esteja configurado com as variáveis de ambiente necessárias:

- `GKE_CLUSTER_NAME=gamgui-cluster`
- `GKE_CLUSTER_LOCATION=us-central1`
- `PROJECT_ID=gamgui-registry`

E que a conta de serviço do Cloud Run tenha as permissões necessárias para acessar o cluster GKE:

- `roles/container.developer`

## Teste

