/**
 * Script para diagnosticar problemas de autenticação GCP no Cloud Run
 */
const { GoogleAuth } = require(require('path').resolve(__dirname, '../../node_modules/google-auth-library'));
const axios = require(require('path').resolve(__dirname, '../../node_modules/axios'));

// Cores para saída
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Função para imprimir mensagens coloridas
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// Função para obter token de acesso GCP
async function getGcpAccessToken() {
  log(BLUE, '=== Tentando obter token de acesso GCP ===');
  
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    log(YELLOW, 'Obtendo cliente de autenticação...');
    const client = await auth.getClient();
    
    log(YELLOW, 'Solicitando token de acesso...');
    const token = await client.getAccessToken();
    
    if (token && token.token) {
      log(GREEN, '✅ Token de acesso GCP obtido com sucesso!');
      log(GREEN, `Token: ${token.token.substring(0, 20)}...`);
      log(GREEN, `Expira em: ${new Date(token.expiryDate).toLocaleString()}`);
      return token.token;
    } else {
      log(RED, '❌ Falha ao obter token de acesso GCP: Token não retornado');
      return null;
    }
  } catch (error) {
    log(RED, '❌ Erro ao obter token de acesso GCP:');
    log(RED, error.message);
    if (error.stack) {
      log(RED, error.stack);
    }
    return null;
  }
}

// Função para verificar variáveis de ambiente
function checkEnvironmentVariables() {
  log(BLUE, '=== Verificando variáveis de ambiente ===');
  
  const requiredVars = [
    'GKE_CLUSTER_NAME',
    'GKE_CLUSTER_LOCATION',
    'PROJECT_ID'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(GREEN, `✅ ${varName}: ${process.env[varName]}`);
    } else {
      log(RED, `❌ ${varName}: Não definido`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// Função para obter informações do cluster GKE
async function getGkeClusterInfo() {
  log(BLUE, '=== Obtendo informações do cluster GKE ===');
  
  const clusterName = process.env.GKE_CLUSTER_NAME;
  const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
  const projectId = process.env.PROJECT_ID;
  
  if (!clusterName || !clusterLocation || !projectId) {
    log(RED, '❌ Variáveis de ambiente necessárias não definidas');
    return null;
  }
  
  try {
    const { execSync } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));
    const command = `gcloud container clusters describe ${clusterName} --region=${clusterLocation} --project=${projectId} --format="json(endpoint,masterAuth.clusterCaCertificate)"`;
    
    log(YELLOW, `Executando comando: ${command}`);
    const clusterInfoJson = execSync(command).toString();
    const clusterInfo = JSON.parse(clusterInfoJson);
    
    if (clusterInfo.endpoint && clusterInfo.masterAuth.clusterCaCertificate) {
      log(GREEN, '✅ Informações do cluster GKE obtidas com sucesso!');
      log(GREEN, `Endpoint: ${clusterInfo.endpoint}`);
      log(GREEN, `CA Certificate: ${clusterInfo.masterAuth.clusterCaCertificate.substring(0, 20)}...`);
      return clusterInfo;
    } else {
      log(RED, '❌ Falha ao obter informações do cluster GKE: Dados incompletos');
      log(RED, JSON.stringify(clusterInfo, null, 2));
      return null;
    }
  } catch (error) {
    log(RED, '❌ Erro ao obter informações do cluster GKE:');
    log(RED, error.message);
    if (error.stdout) {
      log(RED, `Saída: ${error.stdout.toString()}`);
    }
    if (error.stderr) {
      log(RED, `Erro: ${error.stderr.toString()}`);
    }
    return null;
  }
}

// Função para verificar permissões IAM
async function checkIamPermissions() {
  log(BLUE, '=== Verificando permissões IAM ===');
  
  const projectId = process.env.PROJECT_ID;
  
  if (!projectId) {
    log(RED, '❌ PROJECT_ID não definido');
    return false;
  }
  
  try {
    const { execSync } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));
    
    // Obter a conta de serviço do Cloud Run
    log(YELLOW, 'Obtendo conta de serviço do Cloud Run...');
    const serviceAccountCommand = `gcloud run services describe gamgui-server --region=us-central1 --project=${projectId} --format="value(spec.template.spec.serviceAccountName)"`;
    const serviceAccount = execSync(serviceAccountCommand).toString().trim();
    
    if (!serviceAccount) {
      log(RED, '❌ Não foi possível obter a conta de serviço do Cloud Run');
      return false;
    }
    
    log(GREEN, `✅ Conta de serviço do Cloud Run: ${serviceAccount}`);
    
    // Verificar permissões da conta de serviço
    log(YELLOW, 'Verificando permissões da conta de serviço...');
    const permissionsCommand = `gcloud projects get-iam-policy ${projectId} --format="json(bindings)" | grep -A 10 "${serviceAccount}"`;
    
    try {
      const permissionsOutput = execSync(permissionsCommand).toString();
      log(GREEN, '✅ Permissões da conta de serviço:');
      log(GREEN, permissionsOutput);
    } catch (error) {
      log(YELLOW, '⚠️ Não foi possível obter permissões específicas da conta de serviço');
      log(YELLOW, 'Verificando se a conta de serviço tem permissões para acessar o GKE...');
      
      // Verificar se a conta de serviço tem permissões para acessar o GKE
      const gkePermissionsCommand = `gcloud projects get-iam-policy ${projectId} --format="json(bindings)" | grep -A 10 "container"`;
      
      try {
        const gkePermissionsOutput = execSync(gkePermissionsCommand).toString();
        log(GREEN, '✅ Permissões relacionadas ao GKE:');
        log(GREEN, gkePermissionsOutput);
      } catch (error) {
        log(RED, '❌ Não foi possível encontrar permissões relacionadas ao GKE');
      }
    }
    
    return true;
  } catch (error) {
    log(RED, '❌ Erro ao verificar permissões IAM:');
    log(RED, error.message);
    if (error.stdout) {
      log(RED, `Saída: ${error.stdout.toString()}`);
    }
    if (error.stderr) {
      log(RED, `Erro: ${error.stderr.toString()}`);
    }
    return false;
  }
}

// Função para verificar a configuração do Cloud Run
async function checkCloudRunConfig() {
  log(BLUE, '=== Verificando configuração do Cloud Run ===');
  
  const projectId = process.env.PROJECT_ID;
  
  if (!projectId) {
    log(RED, '❌ PROJECT_ID não definido');
    return false;
  }
  
  try {
    const { execSync } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));
    
    // Obter configuração do Cloud Run
    log(YELLOW, 'Obtendo configuração do Cloud Run...');
    const cloudRunConfigCommand = `gcloud run services describe gamgui-server --region=us-central1 --project=${projectId} --format="json(spec.template.spec.containers[0].env)"`;
    const cloudRunConfigOutput = execSync(cloudRunConfigCommand).toString();
    const cloudRunConfig = JSON.parse(cloudRunConfigOutput);
    
    log(GREEN, '✅ Variáveis de ambiente do Cloud Run:');
    
    if (cloudRunConfig && Array.isArray(cloudRunConfig)) {
      const envVars = {};
      
      for (const env of cloudRunConfig) {
        envVars[env.name] = env.value;
        log(GREEN, `${env.name}: ${env.value}`);
      }
      
      // Verificar variáveis específicas
      const requiredVars = [
        'GKE_CLUSTER_NAME',
        'GKE_CLUSTER_LOCATION',
        'PROJECT_ID'
      ];
      
      let allPresent = true;
      
      for (const varName of requiredVars) {
        if (!envVars[varName]) {
          log(RED, `❌ Variável de ambiente ${varName} não definida no Cloud Run`);
          allPresent = false;
        }
      }
      
      return allPresent;
    } else {
      log(RED, '❌ Formato inesperado de configuração do Cloud Run');
      log(RED, JSON.stringify(cloudRunConfig, null, 2));
      return false;
    }
  } catch (error) {
    log(RED, '❌ Erro ao verificar configuração do Cloud Run:');
    log(RED, error.message);
    if (error.stdout) {
      log(RED, `Saída: ${error.stdout.toString()}`);
    }
    if (error.stderr) {
      log(RED, `Erro: ${error.stderr.toString()}`);
    }
    return false;
  }
}

// Função principal
async function main() {
  log(BLUE, '=== Diagnóstico de Autenticação GCP para Cloud Run ===');
  
  // Verificar variáveis de ambiente
  const envVarsOk = checkEnvironmentVariables();
  
  if (!envVarsOk) {
    log(YELLOW, '\n⚠️ Algumas variáveis de ambiente necessárias não estão definidas.');
    log(YELLOW, 'Definindo variáveis de ambiente a partir do projeto...');
    
    try {
      const { execSync } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));
      
      // Obter ID do projeto
      const projectId = execSync('gcloud config get-value project').toString().trim();
      process.env.PROJECT_ID = projectId;
      log(GREEN, `✅ PROJECT_ID definido como: ${projectId}`);
      
      // Obter clusters GKE
      const clustersCommand = 'gcloud container clusters list --format="value(name,location)"';
      const clustersOutput = execSync(clustersCommand).toString().trim();
      
      if (clustersOutput) {
        const clusterInfo = clustersOutput.split('\t');
        if (clusterInfo.length >= 2) {
          process.env.GKE_CLUSTER_NAME = clusterInfo[0];
          process.env.GKE_CLUSTER_LOCATION = clusterInfo[1];
          
          log(GREEN, `✅ GKE_CLUSTER_NAME definido como: ${process.env.GKE_CLUSTER_NAME}`);
          log(GREEN, `✅ GKE_CLUSTER_LOCATION definido como: ${process.env.GKE_CLUSTER_LOCATION}`);
        } else {
          log(RED, '❌ Formato inesperado de informações do cluster');
        }
      } else {
        log(RED, '❌ Nenhum cluster GKE encontrado');
      }
    } catch (error) {
      log(RED, '❌ Erro ao obter informações do projeto:');
      log(RED, error.message);
    }
  }
  
  // Obter token de acesso GCP
  const accessToken = await getGcpAccessToken();
  
  if (!accessToken) {
    log(RED, '\n❌ Não foi possível obter o token de acesso GCP. Verifique as credenciais.');
    return;
  }
  
  // Obter informações do cluster GKE
  const clusterInfo = await getGkeClusterInfo();
  
  if (!clusterInfo) {
    log(RED, '\n❌ Não foi possível obter informações do cluster GKE. Verifique a configuração.');
    return;
  }
  
  // Verificar permissões IAM
  await checkIamPermissions();
  
  // Verificar configuração do Cloud Run
  await checkCloudRunConfig();
  
  log(BLUE, '\n=== Diagnóstico concluído ===');
  
  // Sugestões de correção
  log(YELLOW, '\n=== Sugestões de correção ===');
  log(YELLOW, '1. Verifique se a conta de serviço do Cloud Run tem a permissão "container.clusters.get"');
  log(YELLOW, '2. Verifique se as variáveis de ambiente GKE_CLUSTER_NAME, GKE_CLUSTER_LOCATION e PROJECT_ID estão corretamente definidas no Cloud Run');
  log(YELLOW, '3. Verifique se o Cloud Run tem acesso ao cluster GKE');
  log(YELLOW, '4. Verifique se o token de acesso GCP está sendo obtido corretamente no código');
}

// Executar a função principal
main().catch(error => {
  log(RED, `Erro não tratado: ${error.message}`);
  if (error.stack) {
    log(RED, error.stack);
  }
  process.exit(1);
});
