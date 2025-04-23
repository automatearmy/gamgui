# Testando a Integração com Kubernetes na Nuvem

Este guia explica como testar a integração do GamGUI com Kubernetes em um ambiente de nuvem real.

## Pré-requisitos

Para testar a integração na nuvem, você precisa:

1. Um cluster GKE (Google Kubernetes Engine) criado e configurado
2. A ferramenta `gcloud` instalada e configurada
3. A ferramenta `kubectl` instalada e configurada
4. As imagens Docker do GamGUI publicadas no Container Registry

## Passos para Testar na Nuvem

### 1. Configurar o Acesso ao Cluster GKE

Primeiro, configure o `kubectl` para acessar seu cluster GKE:

```bash
gcloud container clusters get-credentials <nome-do-cluster> --region <região> --project <id-do-projeto>
```

Verifique se o acesso está funcionando:

```bash
kubectl cluster-info
```

### 2. Verificar os Recursos do Kubernetes

Verifique se os recursos necessários foram criados no cluster:

```bash
# Verificar o namespace
kubectl get namespace gamgui

# Verificar a conta de serviço
kubectl get serviceaccount -n gamgui gam-service-account

# Verificar os roles e rolebindings
kubectl get roles -n gamgui
kubectl get rolebindings -n gamgui
```

### 3. Implantar o Servidor GamGUI com Variáveis de Ambiente

Implante o servidor GamGUI no Cloud Run com as variáveis de ambiente necessárias:

```bash
gcloud run deploy gamgui-server \
  --image=gcr.io/gamgui-registry/gamgui-server-image:latest \
  --platform=managed \
  --region=us-central1 \
  --set-env-vars="GKE_CLUSTER_NAME=<nome-do-cluster>,GKE_CLUSTER_LOCATION=<região>,K8S_NAMESPACE=gamgui,K8S_SERVICE_ACCOUNT=gam-service-account,GAM_IMAGE=gcr.io/gamgui-registry/docker-gam7:latest" \
  --allow-unauthenticated
```

### 4. Testar a Criação de Sessão

Acesse a interface do GamGUI e crie uma nova sessão. Em seguida, verifique se um pod foi criado no namespace `gamgui`:

```bash
kubectl get pods -n gamgui
```

Você deve ver um pod com um nome que começa com `gam-session-` seguido por parte do ID da sessão.

### 5. Verificar os Logs do Pod

Verifique os logs do pod para confirmar que ele está funcionando corretamente:

```bash
kubectl logs -n gamgui <nome-do-pod>
```

### 6. Executar Comandos GAM

Na interface do GamGUI, execute alguns comandos GAM na sessão e verifique se eles são executados no pod:

```bash
# Verificar os logs do pod novamente para ver os comandos executados
kubectl logs -n gamgui <nome-do-pod>
```

### 7. Verificar a Exclusão do Pod

Feche a sessão na interface do GamGUI e verifique se o pod foi excluído:

```bash
kubectl get pods -n gamgui
```

O pod deve ter sido excluído automaticamente.

## Verificando o Servidor Cloud Run

Para verificar se o servidor Cloud Run está configurado corretamente:

```bash
# Obter informações sobre o serviço Cloud Run
gcloud run services describe gamgui-server --region=us-central1 --format=yaml
```

Verifique se as variáveis de ambiente estão configuradas corretamente:

```yaml
spec:
  containers:
  - env:
    - name: GKE_CLUSTER_NAME
      value: <nome-do-cluster>
    - name: GKE_CLUSTER_LOCATION
      value: <região>
    - name: K8S_NAMESPACE
      value: gamgui
    - name: K8S_SERVICE_ACCOUNT
      value: gam-service-account
    - name: GAM_IMAGE
      value: gcr.io/gamgui-registry/docker-gam7:latest
```

## Solução de Problemas

Se você encontrar problemas com a integração:

### 1. Verificar os Logs do Servidor

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gamgui-server" --limit=50
```

### 2. Verificar as Permissões da Conta de Serviço

Verifique se a conta de serviço do Cloud Run tem as permissões necessárias para acessar o cluster GKE:

```bash
# Obter a conta de serviço do Cloud Run
gcloud run services describe gamgui-server --region=us-central1 --format="value(spec.template.spec.serviceAccountName)"

# Verificar as permissões da conta de serviço
gcloud projects get-iam-policy <id-do-projeto> --flatten="bindings[].members" --format="table(bindings.role,bindings.members)" --filter="bindings.members:<conta-de-serviço>"
```

A conta de serviço deve ter a permissão `container.developer` para acessar o cluster GKE.

### 3. Verificar a Conectividade

Verifique se o servidor Cloud Run pode acessar o cluster GKE:

```bash
# Criar um job para testar a conectividade
kubectl create job test-connectivity --image=gcr.io/google-containers/busybox -n gamgui -- wget -q -O- https://kubernetes.default.svc
```

### 4. Verificar os Eventos do Kubernetes

```bash
kubectl get events -n gamgui
```

## Conclusão

Se todos os passos acima funcionarem corretamente, a integração com Kubernetes está funcionando na nuvem. Você pode usar o GamGUI para criar sessões GAM em pods Kubernetes isolados, proporcionando melhor isolamento, escalabilidade e gerenciamento de recursos.
