/**
 * Script para diagnosticar problemas de autenticação do Kubernetes
 */
const k8s = require(require('path').resolve(__dirname, '../../node_modules/@kubernetes/client-node'));
const { execSync } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));

// Configuração
const GKE_CLUSTER_NAME = process.env.GKE_CLUSTER_NAME || 'gamgui-cluster';
const GKE_CLUSTER_LOCATION = process.env.GKE_CLUSTER_LOCATION || 'us-central1';
const PROJECT_ID = process.env.PROJECT_ID || 'gamgui-registry';
const NAMESPACE = process.env.K8S_NAMESPACE || 'gamgui';

// Cores para saída
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Função para imprimir mensagens coloridas
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// Função para obter informações do cluster GKE
function getGkeClusterInfo() {
  log(YELLOW, '\n=== Obtendo informações do cluster GKE ===');
  
  try {
    const command = `gcloud container clusters describe ${GKE_CLUSTER_NAME} --region=${GKE_CLUSTER_LOCATION} --project=${PROJECT_ID} --format=json`;
    log(YELLOW, `Executando comando: ${command}`);
    
    const output = execSync(command).toString();
    const clusterInfo = JSON.parse(output);
    
    log(GREEN, '✅ Informações do cluster GKE obtidas com sucesso!');
    log(GREEN, `Nome do cluster: ${clusterInfo.name}`);
    log(GREEN, `Endpoint: ${clusterInfo.endpoint}`);
    log(GREEN, `Versão: ${clusterInfo.currentMasterVersion}`);
    
    return clusterInfo;
  } catch (error) {
    log(RED, `❌ Erro ao obter informações do cluster GKE: ${error.message}`);
    return null;
  }
}

// Função para testar a autenticação do Kubernetes usando loadFromDefault
function testKubernetesAuthDefault() {
  log(YELLOW, '\n=== Testando autenticação do Kubernetes usando loadFromDefault ===');
  
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    
    log(GREEN, '✅ Cliente Kubernetes criado com sucesso usando loadFromDefault!');
    log(YELLOW, 'Testando conexão com o cluster...');
    
    const namespaces = execSync('kubectl get namespaces').toString();
    log(GREEN, '✅ Conexão com o cluster estabelecida com sucesso!');
    log(GREEN, 'Namespaces disponíveis:');
    console.log(namespaces);
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao testar autenticação do Kubernetes usando loadFromDefault: ${error.message}`);
    return false;
  }
}

// Função para testar a autenticação do Kubernetes usando loadFromOptions
function testKubernetesAuthOptions(clusterInfo) {
  log(YELLOW, '\n=== Testando autenticação do Kubernetes usando loadFromOptions ===');
  
  if (!clusterInfo) {
    log(RED, '❌ Não foi possível obter informações do cluster GKE.');
    return false;
  }
  
  try {
    const kc = new k8s.KubeConfig();
    
    // Obter o certificado CA do cluster
    const caCert = Buffer.from(clusterInfo.masterAuth.clusterCaCertificate, 'base64').toString();
    
    // Configurar o cliente Kubernetes usando loadFromOptions
    kc.loadFromOptions({
      clusters: [{
        name: 'gke-cluster',
        server: `https://${clusterInfo.endpoint}`,
        caData: clusterInfo.masterAuth.clusterCaCertificate,
      }],
      users: [{
        name: 'cloudrun-service-account',
        authProvider: { 
          name: 'gcp' 
        } 
      }],
      contexts: [{
        name: 'gke-context',
        user: 'cloudrun-service-account',
        cluster: 'gke-cluster',
      }],
      currentContext: 'gke-context',
    });
    
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    
    log(GREEN, '✅ Cliente Kubernetes criado com sucesso usando loadFromOptions!');
    
    // Tentar listar namespaces
    log(YELLOW, 'Tentando listar namespaces...');
    
    // Usar o cliente para listar namespaces
    return k8sCoreV1Api.listNamespace()
      .then(response => {
        log(GREEN, '✅ Namespaces listados com sucesso!');
        log(GREEN, `Número de namespaces: ${response.body.items.length}`);
        
        // Listar alguns namespaces
        const namespaces = response.body.items.slice(0, 5).map(ns => ns.metadata.name);
        log(GREEN, `Primeiros namespaces: ${namespaces.join(', ')}`);
        
        return true;
      })
      .catch(error => {
        log(RED, `❌ Erro ao listar namespaces: ${error.message}`);
        
        // Verificar se é um erro de autenticação
        if (error.message.includes('Unauthorized') || error.message.includes('PERMISSION_DENIED')) {
          log(RED, '❌ Erro de autenticação. Verifique se a conta de serviço tem as permissões necessárias.');
        }
        
        return false;
      });
  } catch (error) {
    log(RED, `❌ Erro ao testar autenticação do Kubernetes usando loadFromOptions: ${error.message}`);
    return false;
  }
}

// Função para testar a criação de um pod
async function testCreatePod() {
  log(YELLOW, '\n=== Testando criação de um pod ===');
  
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    
    // Definir o pod
    const podName = `test-pod-${Date.now().toString(36)}`;
    const podManifest = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
        namespace: NAMESPACE,
        labels: {
          app: 'gamgui-test'
        }
      },
      spec: {
        containers: [
          {
            name: 'test-container',
            image: 'nginx:alpine',
            ports: [
              {
                containerPort: 80
              }
            ]
          }
        ]
      }
    };
    
    log(YELLOW, `Criando pod ${podName}...`);
    
    // Criar o pod
    const response = await k8sCoreV1Api.createNamespacedPod(NAMESPACE, podManifest);
    
    log(GREEN, `✅ Pod ${podName} criado com sucesso!`);
    
    // Aguardar um pouco
    log(YELLOW, 'Aguardando 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar o status do pod
    log(YELLOW, `Verificando status do pod ${podName}...`);
    const podStatus = await k8sCoreV1Api.readNamespacedPodStatus(podName, NAMESPACE);
    
    log(GREEN, `✅ Status do pod ${podName}: ${podStatus.body.status.phase}`);
    
    // Excluir o pod
    log(YELLOW, `Excluindo pod ${podName}...`);
    await k8sCoreV1Api.deleteNamespacedPod(podName, NAMESPACE);
    
    log(GREEN, `✅ Pod ${podName} excluído com sucesso!`);
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao testar criação de pod: ${error.message}`);
    
    // Verificar se é um erro de autenticação
    if (error.message.includes('Unauthorized') || error.message.includes('PERMISSION_DENIED')) {
      log(RED, '❌ Erro de autenticação. Verifique se a conta de serviço tem as permissões necessárias.');
    }
    
    return false;
  }
}

// Função para verificar as permissões da conta de serviço
function checkServiceAccountPermissions() {
  log(YELLOW, '\n=== Verificando permissões da conta de serviço ===');
  
  try {
    // Obter a conta de serviço atual
    const command = 'gcloud config get-value account';
    const account = execSync(command).toString().trim();
    
    log(GREEN, `Conta atual: ${account}`);
    
    // Verificar as permissões da conta de serviço
    const permissionsCommand = `gcloud projects get-iam-policy ${PROJECT_ID} --format="table(bindings.role,bindings.members)" --flatten="bindings[].members" --filter="bindings.members:${account}"`;
    log(YELLOW, `Executando comando: ${permissionsCommand}`);
    
    const permissions = execSync(permissionsCommand).toString();
    
    log(GREEN, '✅ Permissões da conta de serviço:');
    console.log(permissions);
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao verificar permissões da conta de serviço: ${error.message}`);
    return false;
  }
}

// Função para verificar a configuração do kubectl
function checkKubectlConfig() {
  log(YELLOW, '\n=== Verificando configuração do kubectl ===');
  
  try {
    // Verificar o contexto atual
    const currentContextCommand = 'kubectl config current-context';
    const currentContext = execSync(currentContextCommand).toString().trim();
    
    log(GREEN, `Contexto atual: ${currentContext}`);
    
    // Verificar o cluster atual
    const currentClusterCommand = 'kubectl config view --minify --output=jsonpath={.clusters[].name}';
    const currentCluster = execSync(currentClusterCommand).toString().trim();
    
    log(GREEN, `Cluster atual: ${currentCluster}`);
    
    // Verificar o usuário atual
    const currentUserCommand = 'kubectl config view --minify --output=jsonpath={.users[].name}';
    const currentUser = execSync(currentUserCommand).toString().trim();
    
    log(GREEN, `Usuário atual: ${currentUser}`);
    
    // Verificar se o namespace existe
    const namespaceCommand = `kubectl get namespace ${NAMESPACE}`;
    const namespaceOutput = execSync(namespaceCommand).toString();
    
    log(GREEN, `✅ Namespace ${NAMESPACE} existe!`);
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao verificar configuração do kubectl: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  log(GREEN, '=== Diagnóstico de Autenticação do Kubernetes ===');
  log(GREEN, `Cluster GKE: ${GKE_CLUSTER_NAME}`);
  log(GREEN, `Região: ${GKE_CLUSTER_LOCATION}`);
  log(GREEN, `Projeto: ${PROJECT_ID}`);
  log(GREEN, `Namespace: ${NAMESPACE}`);
  
  // Verificar a configuração do kubectl
  checkKubectlConfig();
  
  // Verificar as permissões da conta de serviço
  checkServiceAccountPermissions();
  
  // Obter informações do cluster GKE
  const clusterInfo = getGkeClusterInfo();
  
  // Testar a autenticação do Kubernetes usando loadFromDefault
  const defaultAuthSuccess = testKubernetesAuthDefault();
  
  // Testar a autenticação do Kubernetes usando loadFromOptions
  const optionsAuthSuccess = await testKubernetesAuthOptions(clusterInfo);
  
  // Testar a criação de um pod
  if (defaultAuthSuccess) {
    await testCreatePod();
  }
  
  // Resumo
  log(YELLOW, '\n=== Resumo do Diagnóstico ===');
  log(defaultAuthSuccess ? GREEN : RED, `Autenticação usando loadFromDefault: ${defaultAuthSuccess ? 'Sucesso' : 'Falha'}`);
  log(optionsAuthSuccess ? GREEN : RED, `Autenticação usando loadFromOptions: ${optionsAuthSuccess ? 'Sucesso' : 'Falha'}`);
  
  // Recomendações
  log(YELLOW, '\n=== Recomendações ===');
  
  if (!defaultAuthSuccess && !optionsAuthSuccess) {
    log(RED, '❌ Ambos os métodos de autenticação falharam. Verifique:');
    log(RED, '1. Se a conta de serviço tem as permissões necessárias (roles/container.developer)');
    log(RED, '2. Se o cluster GKE existe e está acessível');
    log(RED, '3. Se as variáveis de ambiente estão configuradas corretamente');
  } else if (!defaultAuthSuccess && optionsAuthSuccess) {
    log(YELLOW, '⚠️ A autenticação usando loadFromDefault falhou, mas loadFromOptions funcionou.');
    log(YELLOW, 'Isso sugere que o código deve usar explicitamente loadFromOptions para autenticar com o cluster GKE.');
  } else if (defaultAuthSuccess && !optionsAuthSuccess) {
    log(YELLOW, '⚠️ A autenticação usando loadFromOptions falhou, mas loadFromDefault funcionou.');
    log(YELLOW, 'Isso sugere que o código deve usar loadFromDefault para autenticar com o cluster GKE.');
  } else {
    log(GREEN, '✅ Ambos os métodos de autenticação funcionaram!');
    log(GREEN, 'Se você ainda está enfrentando problemas, verifique:');
    log(GREEN, '1. Se o código está usando o método de autenticação correto');
    log(GREEN, '2. Se há outros problemas no código que não estão relacionados à autenticação');
  }
}

// Executar a função principal
main().catch(error => {
  log(RED, `Erro não tratado: ${error.message}`);
  process.exit(1);
});
