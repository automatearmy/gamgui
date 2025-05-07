/**
 * Script para diagnosticar problemas com as variáveis de ambiente no Cloud Run
 * Verifica as variáveis de ambiente necessárias para a conexão com o Kubernetes
 */

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
    'K8S_NAMESPACE',
    'K_REVISION', // Variável específica do Cloud Run
    'CLOUD_RUN_REVISION' // Variável que usamos para detectar o Cloud Run
  ];
  
  const optionalVars = [
    'WEBSOCKET_ENABLED',
    'WEBSOCKET_PROXY_SERVICE_URL',
    'WEBSOCKET_SESSION_CONNECTION_TEMPLATE',
    'WEBSOCKET_SESSION_PATH_TEMPLATE',
    'WEBSOCKET_MAX_SESSIONS',
    'WEBSOCKET_SESSION_TIMEOUT',
    'WEBSOCKET_CLEANUP_INTERVAL'
  ];
  
  let allRequiredPresent = true;
  
  log(YELLOW, '\nVariáveis obrigatórias:');
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(GREEN, `✅ ${varName}: ${process.env[varName]}`);
    } else {
      log(RED, `❌ ${varName}: não definido`);
      allRequiredPresent = false;
    }
  }
  
  log(YELLOW, '\nVariáveis opcionais:');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      log(GREEN, `✅ ${varName}: ${process.env[varName]}`);
    } else {
      log(YELLOW, `⚠️ ${varName}: não definido`);
    }
  }
  
  return allRequiredPresent;
}

// Função para verificar a detecção do Cloud Run
function checkCloudRunDetection() {
  log(YELLOW, '\n=== Verificando detecção do Cloud Run ===');
  
  const isCloudRun = Boolean(process.env.K_REVISION);
  
  if (isCloudRun) {
    log(GREEN, `✅ Executando no Cloud Run (K_REVISION: ${process.env.K_REVISION})`);
  } else {
    log(RED, `❌ Não está executando no Cloud Run (K_REVISION não definido)`);
  }
  
  const cloudRunRevisionFlag = process.env.CLOUD_RUN_REVISION === 'true';
  
  if (cloudRunRevisionFlag) {
    log(GREEN, `✅ Flag CLOUD_RUN_REVISION está definida como 'true'`);
  } else {
    log(RED, `❌ Flag CLOUD_RUN_REVISION não está definida como 'true' (valor atual: ${process.env.CLOUD_RUN_REVISION || 'não definido'})`);
  }
  
  return isCloudRun && cloudRunRevisionFlag;
}

// Função para verificar a configuração do Kubernetes
function checkKubernetesConfig() {
  log(YELLOW, '\n=== Verificando configuração do Kubernetes ===');
  
  const clusterName = process.env.GKE_CLUSTER_NAME;
  const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
  const projectId = process.env.PROJECT_ID;
  const namespace = process.env.K8S_NAMESPACE || 'gamgui';
  
  if (!clusterName || !clusterLocation || !projectId) {
    log(RED, `❌ Configuração do Kubernetes incompleta`);
    return false;
  }
  
  log(GREEN, `✅ Cluster GKE: ${clusterName}`);
  log(GREEN, `✅ Localização: ${clusterLocation}`);
  log(GREEN, `✅ Projeto: ${projectId}`);
  log(GREEN, `✅ Namespace: ${namespace}`);
  
  return true;
}

// Função para verificar a configuração do WebSocket
function checkWebSocketConfig() {
  log(YELLOW, '\n=== Verificando configuração do WebSocket ===');
  
  const websocketEnabled = process.env.WEBSOCKET_ENABLED === 'true';
  
  if (websocketEnabled) {
    log(GREEN, `✅ WebSocket está habilitado`);
    
    const proxyServiceUrl = process.env.WEBSOCKET_PROXY_SERVICE_URL;
    const sessionConnectionTemplate = process.env.WEBSOCKET_SESSION_CONNECTION_TEMPLATE;
    const sessionPathTemplate = process.env.WEBSOCKET_SESSION_PATH_TEMPLATE;
    
    if (!proxyServiceUrl) {
      log(RED, `❌ WEBSOCKET_PROXY_SERVICE_URL não definido`);
    } else {
      log(GREEN, `✅ WEBSOCKET_PROXY_SERVICE_URL: ${proxyServiceUrl}`);
    }
    
    if (!sessionConnectionTemplate) {
      log(RED, `❌ WEBSOCKET_SESSION_CONNECTION_TEMPLATE não definido`);
    } else {
      log(GREEN, `✅ WEBSOCKET_SESSION_CONNECTION_TEMPLATE: ${sessionConnectionTemplate}`);
    }
    
    if (!sessionPathTemplate) {
      log(RED, `❌ WEBSOCKET_SESSION_PATH_TEMPLATE não definido`);
    } else {
      log(GREEN, `✅ WEBSOCKET_SESSION_PATH_TEMPLATE: ${sessionPathTemplate}`);
    }
    
    return proxyServiceUrl && sessionConnectionTemplate && sessionPathTemplate;
  } else {
    log(YELLOW, `⚠️ WebSocket está desabilitado`);
    return true; // Não é um erro se o WebSocket estiver desabilitado
  }
}

// Função para verificar a configuração do Docker
function checkDockerConfig() {
  log(YELLOW, '\n=== Verificando configuração do Docker ===');
  
  const gamImage = process.env.GAM_IMAGE;
  
  if (!gamImage) {
    log(RED, `❌ GAM_IMAGE não definido`);
    return false;
  }
  
  log(GREEN, `✅ GAM_IMAGE: ${gamImage}`);
  
  return true;
}

// Função para simular a inicialização do adaptador Kubernetes
function simulateKubernetesAdapterInitialization() {
  log(YELLOW, '\n=== Simulando inicialização do adaptador Kubernetes ===');
  
  // Verificar variáveis de ambiente necessárias
  const clusterName = process.env.GKE_CLUSTER_NAME;
  const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
  const projectId = process.env.PROJECT_ID;
  
  if (!clusterName || !clusterLocation || !projectId) {
    log(RED, `❌ Variáveis de ambiente necessárias para inicialização do adaptador Kubernetes não definidas`);
    return false;
  }
  
  log(GREEN, `✅ Variáveis de ambiente necessárias para inicialização do adaptador Kubernetes definidas`);
  
  // Verificar se o adaptador Kubernetes seria usado
  const isCloudRun = Boolean(process.env.K_REVISION);
  const kubernetesEnabled = true; // Sempre true no Cloud Run
  
  if (isCloudRun) {
    log(GREEN, `✅ Executando no Cloud Run, adaptador Kubernetes seria usado`);
  } else if (kubernetesEnabled) {
    log(GREEN, `✅ Kubernetes habilitado, adaptador Kubernetes seria usado`);
  } else {
    log(RED, `❌ Não está executando no Cloud Run e Kubernetes não está habilitado, adaptador Kubernetes não seria usado`);
    return false;
  }
  
  return true;
}

// Função principal
function main() {
  log(GREEN, '=== Diagnóstico de Variáveis de Ambiente no Cloud Run ===');
  
  // Verificar variáveis de ambiente
  const envVarsOk = checkEnvironmentVariables();
  
  // Verificar detecção do Cloud Run
  const cloudRunDetectionOk = checkCloudRunDetection();
  
  // Verificar configuração do Kubernetes
  const kubernetesConfigOk = checkKubernetesConfig();
  
  // Verificar configuração do WebSocket
  const webSocketConfigOk = checkWebSocketConfig();
  
  // Verificar configuração do Docker
  const dockerConfigOk = checkDockerConfig();
  
  // Simular inicialização do adaptador Kubernetes
  const kubernetesAdapterInitOk = simulateKubernetesAdapterInitialization();
  
  // Resumo
  log(YELLOW, '\n=== Resumo do diagnóstico ===');
  
  if (envVarsOk) {
    log(GREEN, `✅ Variáveis de ambiente: OK`);
  } else {
    log(RED, `❌ Variáveis de ambiente: FALHA`);
  }
  
  if (cloudRunDetectionOk) {
    log(GREEN, `✅ Detecção do Cloud Run: OK`);
  } else {
    log(RED, `❌ Detecção do Cloud Run: FALHA`);
  }
  
  if (kubernetesConfigOk) {
    log(GREEN, `✅ Configuração do Kubernetes: OK`);
  } else {
    log(RED, `❌ Configuração do Kubernetes: FALHA`);
  }
  
  if (webSocketConfigOk) {
    log(GREEN, `✅ Configuração do WebSocket: OK`);
  } else {
    log(RED, `❌ Configuração do WebSocket: FALHA`);
  }
  
  if (dockerConfigOk) {
    log(GREEN, `✅ Configuração do Docker: OK`);
  } else {
    log(RED, `❌ Configuração do Docker: FALHA`);
  }
  
  if (kubernetesAdapterInitOk) {
    log(GREEN, `✅ Inicialização do adaptador Kubernetes: OK`);
  } else {
    log(RED, `❌ Inicialização do adaptador Kubernetes: FALHA`);
  }
  
  // Conclusão
  if (envVarsOk && cloudRunDetectionOk && kubernetesConfigOk && webSocketConfigOk && dockerConfigOk && kubernetesAdapterInitOk) {
    log(GREEN, '\n✅ Todas as verificações passaram. A configuração do ambiente parece correta.');
  } else {
    log(RED, '\n❌ Algumas verificações falharam. Corrija os problemas identificados acima.');
  }
}

// Executar a função principal
main();
