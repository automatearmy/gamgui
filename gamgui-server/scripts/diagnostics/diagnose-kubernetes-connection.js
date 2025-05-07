/**
 * Script para diagnosticar problemas de conexão com o Kubernetes
 * Verifica variáveis de ambiente, autenticação GCP e conexão com o cluster GKE
 */
const k8s = require('@kubernetes/client-node');
const { GoogleAuth } = require('google-auth-library');
const https = require('https');

// Cores para saída
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Função para imprimir mensagens coloridas
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// Função para verificar variáveis de ambiente
function checkEnvironmentVariables() {
  log(YELLOW, '\n=== Verificando variáveis de ambiente ===');
  
  const requiredVars = [
    'GKE_CLUSTER_NAME',
    'GKE_CLUSTER_LOCATION',
    'PROJECT_ID',
    'K8S_NAMESPACE'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(GREEN, `✅ ${varName}: ${process.env[varName]}`);
    } else {
      log(RED, `❌ ${varName}: não definido`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// Função para obter token de acesso GCP
async function getGcpAccessToken() {
  log(YELLOW, '\n=== Obtendo token de acesso GCP ===');
  
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    log(YELLOW, 'Obtendo cliente de autenticação GCP...');
    const client = await auth.getClient();
    
    log(YELLOW, 'Solicitando token de acesso...');
    const tokenResponse = await client.getAccessToken();
    
    if (tokenResponse && tokenResponse.token) {
      log(GREEN, `✅ Token de acesso obtido com sucesso: ${tokenResponse.token.substring(0, 10)}...`);
      return tokenResponse.token;
    } else {
      log(RED, '❌ Falha ao obter token de acesso: Token não retornado');
      return null;
    }
  } catch (error) {
    log(RED, `❌ Erro ao obter token de acesso GCP: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return null;
  }
}

// Função para obter informações do cluster GKE
async function getClusterInfo(projectId, location, clusterName, accessToken) {
  log(YELLOW, `\n=== Obtendo informações do cluster GKE ${clusterName} ===`);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'container.googleapis.com',
      path: `/v1/projects/${projectId}/locations/${location}/clusters/${clusterName}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    };
    
    log(YELLOW, `Fazendo requisição para: ${options.hostname}${options.path}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const clusterInfo = JSON.parse(data);
            log(GREEN, `✅ Informações do cluster obtidas com sucesso`);
            log(GREEN, `✅ Endpoint: ${clusterInfo.endpoint}`);
            log(GREEN, `✅ Status: ${clusterInfo.status}`);
            resolve(clusterInfo);
          } catch (error) {
            log(RED, `❌ Erro ao analisar informações do cluster: ${error.message}`);
            reject(error);
          }
        } else {
          log(RED, `❌ Falha ao obter informações do cluster: ${res.statusCode} ${res.statusMessage}`);
          log(RED, `Resposta: ${data}`);
          reject(new Error(`Falha ao obter informações do cluster: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (error) => {
      log(RED, `❌ Erro na requisição: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

// Função para testar conexão com o cluster Kubernetes
async function testKubernetesConnection(clusterEndpoint, clusterCaCertificate, accessToken) {
  log(YELLOW, '\n=== Testando conexão com o cluster Kubernetes ===');
  
  try {
    const kc = new k8s.KubeConfig();
    
    kc.loadFromOptions({
      clusters: [{
        name: 'gke-cluster',
        server: `https://${clusterEndpoint}`,
        caData: clusterCaCertificate,
        skipTLSVerify: false
      }],
      users: [{
        name: 'gcp-user',
        token: accessToken
      }],
      contexts: [{
        name: 'gke-context',
        cluster: 'gke-cluster',
        user: 'gcp-user'
      }],
      currentContext: 'gke-context'
    });
    
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    
    log(YELLOW, 'Listando namespaces...');
    const namespaces = await k8sCoreV1Api.listNamespace();
    
    log(GREEN, `✅ Conexão com o cluster Kubernetes bem-sucedida`);
    log(GREEN, `✅ Encontrados ${namespaces.body.items.length} namespaces`);
    
    // Listar os namespaces
    log(YELLOW, '\nNamespaces:');
    namespaces.body.items.forEach(namespace => {
      log(GREEN, `- ${namespace.metadata.name}`);
    });
    
    // Verificar namespace específico
    const namespace = process.env.K8S_NAMESPACE || 'gamgui';
    log(YELLOW, `\nVerificando namespace ${namespace}...`);
    
    try {
      const namespaceInfo = await k8sCoreV1Api.readNamespace(namespace);
      log(GREEN, `✅ Namespace ${namespace} encontrado`);
      log(GREEN, `✅ Status: ${namespaceInfo.body.status.phase}`);
      
      // Listar pods no namespace
      log(YELLOW, `\nListando pods no namespace ${namespace}...`);
      const pods = await k8sCoreV1Api.listNamespacedPod(namespace);
      
      if (pods.body.items.length === 0) {
        log(YELLOW, `Nenhum pod encontrado no namespace ${namespace}`);
      } else {
        log(GREEN, `✅ Encontrados ${pods.body.items.length} pods`);
        
        // Listar os pods
        log(YELLOW, '\nPods:');
        pods.body.items.forEach(pod => {
          log(GREEN, `- ${pod.metadata.name} (Status: ${pod.status.phase})`);
        });
      }
      
      // Listar secrets no namespace
      log(YELLOW, `\nListando secrets no namespace ${namespace}...`);
      const secrets = await k8sCoreV1Api.listNamespacedSecret(namespace);
      
      if (secrets.body.items.length === 0) {
        log(YELLOW, `Nenhum secret encontrado no namespace ${namespace}`);
      } else {
        log(GREEN, `✅ Encontrados ${secrets.body.items.length} secrets`);
        
        // Verificar se existe o secret gam-credentials
        const gamCredentialsSecret = secrets.body.items.find(secret => secret.metadata.name === 'gam-credentials');
        
        if (gamCredentialsSecret) {
          log(GREEN, `✅ Secret gam-credentials encontrado`);
          log(GREEN, `✅ Chaves: ${Object.keys(gamCredentialsSecret.data).join(', ')}`);
        } else {
          log(RED, `❌ Secret gam-credentials não encontrado`);
        }
      }
      
      return true;
    } catch (error) {
      log(RED, `❌ Erro ao verificar namespace ${namespace}: ${error.message}`);
      if (error.response && error.response.body) {
        log(RED, `Detalhes: ${JSON.stringify(error.response.body)}`);
      }
      return false;
    }
  } catch (error) {
    log(RED, `❌ Erro ao testar conexão com o cluster Kubernetes: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função principal
async function main() {
  log(GREEN, '=== Diagnóstico de Conexão com o Kubernetes ===');
  
  // Verificar variáveis de ambiente
  const envVarsOk = checkEnvironmentVariables();
  
  if (!envVarsOk) {
    log(RED, '\n❌ Variáveis de ambiente ausentes. Defina as variáveis necessárias e tente novamente.');
    return;
  }
  
  // Obter token de acesso GCP
  const accessToken = await getGcpAccessToken();
  
  if (!accessToken) {
    log(RED, '\n❌ Falha ao obter token de acesso GCP. Verifique as credenciais e permissões.');
    return;
  }
  
  // Obter informações do cluster GKE
  try {
    const clusterInfo = await getClusterInfo(
      process.env.PROJECT_ID,
      process.env.GKE_CLUSTER_LOCATION,
      process.env.GKE_CLUSTER_NAME,
      accessToken
    );
    
    // Testar conexão com o cluster Kubernetes
    await testKubernetesConnection(
      clusterInfo.endpoint,
      clusterInfo.masterAuth.clusterCaCertificate,
      accessToken
    );
  } catch (error) {
    log(RED, `\n❌ Falha ao obter informações do cluster GKE: ${error.message}`);
  }
  
  log(GREEN, '\n=== Diagnóstico concluído ===');
}

// Executar a função principal
main().catch(error => {
  log(RED, `\nErro não tratado: ${error.message}`);
  if (error.stack) {
    log(RED, error.stack);
  }
  process.exit(1);
});
