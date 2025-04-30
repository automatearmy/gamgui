/**
 * Script para diagnosticar problemas de autenticação do GCP
 */
const { GoogleAuth } = require(require('path').resolve(__dirname, '../../node_modules/google-auth-library'));
const k8s = require(require('path').resolve(__dirname, '../../node_modules/@kubernetes/client-node'));
const { execSync } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));

// Cores para saída
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Função para imprimir mensagens coloridas
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// Função para obter o token de acesso do GCP
async function getGcpAccessToken() {
  log(YELLOW, '\n=== Obtendo token de acesso do GCP ===');
  
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    log(YELLOW, 'Obtendo cliente de autenticação...');
    const client = await auth.getClient();
    
    log(YELLOW, 'Obtendo token de acesso...');
    const token = await client.getAccessToken();
    
    if (token && token.token) {
      log(GREEN, '✅ Token de acesso obtido com sucesso!');
      log(GREEN, `Token: ${token.token.substring(0, 10)}...`);
      log(GREEN, `Expira em: ${new Date(token.expiryDate).toLocaleString()}`);
      return token.token;
    } else {
      log(RED, '❌ Não foi possível obter o token de acesso.');
      return null;
    }
  } catch (error) {
    log(RED, `❌ Erro ao obter token de acesso: ${error.message}`);
    return null;
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
    
    // Verificar a configuração do usuário
    const userConfigCommand = `kubectl config view --minify --output=jsonpath='{.users[?(@.name=="${currentUser}")].user}'`;
    const userConfig = execSync(userConfigCommand).toString().trim();
    
    log(GREEN, `Configuração do usuário: ${userConfig}`);
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao verificar configuração do kubectl: ${error.message}`);
    return false;
  }
}

// Função para verificar a autenticação do GKE
async function checkGkeAuth() {
  log(YELLOW, '\n=== Verificando autenticação do GKE ===');
  
  try {
    // Verificar se o gcloud está autenticado
    const gcloudAuthCommand = 'gcloud auth list --format="value(account)"';
    const gcloudAuth = execSync(gcloudAuthCommand).toString().trim();
    
    if (gcloudAuth) {
      log(GREEN, `✅ gcloud autenticado como: ${gcloudAuth}`);
    } else {
      log(RED, '❌ gcloud não está autenticado.');
      return false;
    }
    
    // Verificar se o application-default está configurado
    try {
      const appDefaultCommand = 'gcloud auth application-default print-access-token';
      const appDefaultToken = execSync(appDefaultCommand).toString().trim();
      
      if (appDefaultToken) {
        log(GREEN, '✅ application-default configurado corretamente.');
      } else {
        log(RED, '❌ application-default não está configurado.');
      }
    } catch (error) {
      log(RED, `❌ Erro ao verificar application-default: ${error.message}`);
      log(YELLOW, 'Executando gcloud auth application-default login...');
      
      try {
        execSync('gcloud auth application-default login');
        log(GREEN, '✅ application-default configurado com sucesso.');
      } catch (loginError) {
        log(RED, `❌ Erro ao configurar application-default: ${loginError.message}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao verificar autenticação do GKE: ${error.message}`);
    return false;
  }
}

// Função para verificar a autenticação do Kubernetes
async function checkKubernetesAuth() {
  log(YELLOW, '\n=== Verificando autenticação do Kubernetes ===');
  
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    
    log(GREEN, '✅ Cliente Kubernetes criado com sucesso!');
    
    // Verificar o token de acesso
    const user = kc.getCurrentUser();
    
    if (user) {
      log(GREEN, `Usuário atual: ${user.name}`);
      
      if (user.authProvider) {
        log(GREEN, `Provedor de autenticação: ${user.authProvider.name}`);
        
        if (user.authProvider.config) {
          log(GREEN, 'Configuração do provedor de autenticação:');
          console.log(user.authProvider.config);
          
          if (user.authProvider.config['access-token']) {
            log(GREEN, '✅ Token de acesso encontrado!');
          } else {
            log(RED, '❌ Token de acesso não encontrado na configuração do provedor de autenticação.');
            
            // Tentar obter o token de acesso do GCP
            const token = await getGcpAccessToken();
            
            if (token) {
              log(GREEN, '✅ Token de acesso obtido do GCP. Atualizando configuração do kubectl...');
              
              try {
                execSync(`kubectl config set-credentials ${user.name} --auth-provider=gcp --auth-provider-arg=access-token=${token}`);
                log(GREEN, '✅ Configuração do kubectl atualizada com sucesso!');
              } catch (updateError) {
                log(RED, `❌ Erro ao atualizar configuração do kubectl: ${updateError.message}`);
              }
            }
          }
        } else {
          log(RED, '❌ Configuração do provedor de autenticação não encontrada.');
        }
      } else {
        log(RED, '❌ Provedor de autenticação não encontrado.');
      }
    } else {
      log(RED, '❌ Usuário atual não encontrado.');
    }
    
    // Testar a conexão com o cluster
    try {
      const namespaces = await k8sCoreV1Api.listNamespace();
      log(GREEN, '✅ Conexão com o cluster estabelecida com sucesso!');
      log(GREEN, `Número de namespaces: ${namespaces.body.items.length}`);
      
      // Listar alguns namespaces
      const namespaceNames = namespaces.body.items.slice(0, 5).map(ns => ns.metadata.name);
      log(GREEN, `Primeiros namespaces: ${namespaceNames.join(', ')}`);
      
      return true;
    } catch (error) {
      log(RED, `❌ Erro ao listar namespaces: ${error.message}`);
      
      // Verificar se é um erro de autenticação
      if (error.message.includes('Unauthorized') || error.message.includes('PERMISSION_DENIED')) {
        log(RED, '❌ Erro de autenticação. Verifique se a conta de serviço tem as permissões necessárias.');
      }
      
      return false;
    }
  } catch (error) {
    log(RED, `❌ Erro ao verificar autenticação do Kubernetes: ${error.message}`);
    return false;
  }
}

// Função para verificar a conta de serviço do Cloud Run
async function checkCloudRunServiceAccount() {
  log(YELLOW, '\n=== Verificando conta de serviço do Cloud Run ===');
  
  try {
    // Obter a conta de serviço do Cloud Run
    const command = 'gcloud run services describe gamgui-server --region=us-central1 --format="value(spec.template.spec.serviceAccountName)"';
    const serviceAccount = execSync(command).toString().trim();
    
    if (serviceAccount) {
      log(GREEN, `✅ Conta de serviço do Cloud Run: ${serviceAccount}`);
      
      // Verificar as permissões da conta de serviço
      const permissionsCommand = `gcloud projects get-iam-policy gamgui-registry --format="table(bindings.role,bindings.members)" --flatten="bindings[].members" --filter="bindings.members:${serviceAccount}"`;
      const permissions = execSync(permissionsCommand).toString();
      
      log(GREEN, '✅ Permissões da conta de serviço:');
      console.log(permissions);
      
      // Verificar se a conta de serviço tem as permissões necessárias
      if (permissions.includes('roles/container.developer') || 
          permissions.includes('roles/container.admin') || 
          permissions.includes('roles/container.clusterAdmin') || 
          permissions.includes('roles/container.clusterViewer')) {
        log(GREEN, '✅ A conta de serviço tem as permissões necessárias para acessar o GKE.');
      } else {
        log(RED, '❌ A conta de serviço não tem as permissões necessárias para acessar o GKE.');
        log(YELLOW, 'Adicionando permissão roles/container.clusterViewer...');
        
        try {
          execSync(`gcloud projects add-iam-policy-binding gamgui-registry --member=serviceAccount:${serviceAccount} --role=roles/container.clusterViewer`);
          log(GREEN, '✅ Permissão roles/container.clusterViewer adicionada com sucesso!');
        } catch (addError) {
          log(RED, `❌ Erro ao adicionar permissão: ${addError.message}`);
        }
      }
      
      return true;
    } else {
      log(RED, '❌ Não foi possível obter a conta de serviço do Cloud Run.');
      return false;
    }
  } catch (error) {
    log(RED, `❌ Erro ao verificar conta de serviço do Cloud Run: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  log(GREEN, '=== Diagnóstico de Autenticação do GCP e Kubernetes ===');
  
  // Verificar a autenticação do GCP
  await checkGkeAuth();
  
  // Verificar a configuração do kubectl
  checkKubectlConfig();
  
  // Verificar a conta de serviço do Cloud Run
  await checkCloudRunServiceAccount();
  
  // Verificar a autenticação do Kubernetes
  await checkKubernetesAuth();
  
  // Obter o token de acesso do GCP
  await getGcpAccessToken();
  
  log(GREEN, '\n=== Diagnóstico concluído ===');
}

// Executar a função principal
main().catch(error => {
  log(RED, `Erro não tratado: ${error.message}`);
  process.exit(1);
});
