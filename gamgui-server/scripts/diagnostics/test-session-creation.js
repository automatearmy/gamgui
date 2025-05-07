/**
 * Script para testar a criação de uma sessão no GAMGUI
 */
const axios = require(require('path').resolve(__dirname, '../../node_modules/axios'));

// Configuração
const SERVER_URL = process.env.SERVER_URL || 'https://gamgui-server-vthtec4m3a-uc.a.run.app';
const SESSION_NAME = 'test-session-' + Date.now().toString(36);

// Função para criar uma sessão
async function createSession() {
  console.log(`\n=== Criando sessão: ${SESSION_NAME} ===`);
  
  try {
    const response = await axios.post(`${SERVER_URL}/api/sessions`, {
      name: SESSION_NAME,
      config: {
        resources: {
          cpu: '250m',
          memory: '256Mi'
        }
      }
    });
    
    console.log('✅ Sessão criada com sucesso!');
    console.log('ID da sessão:', response.data.session.id);
    console.log('Nome da sessão:', response.data.session.name);
    console.log('Status da sessão:', response.data.session.status);
    
    if (response.data.websocketInfo) {
      console.log('\nInformações do WebSocket:');
      console.log('Path:', response.data.websocketInfo.path);
      console.log('Service Name:', response.data.websocketInfo.serviceName);
    }
    
    return response.data.session.id;
  } catch (error) {
    console.error('❌ Erro ao criar sessão:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    return null;
  }
}

// Função para obter informações de uma sessão
async function getSession(sessionId) {
  console.log(`\n=== Obtendo informações da sessão: ${sessionId} ===`);
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/sessions/${sessionId}`);
    
    console.log('✅ Informações da sessão obtidas com sucesso!');
    console.log('ID da sessão:', response.data.session.id);
    console.log('Nome da sessão:', response.data.session.name);
    console.log('Status da sessão:', response.data.session.status);
    
    return response.data.session;
  } catch (error) {
    console.error('❌ Erro ao obter informações da sessão:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    return null;
  }
}

// Função para obter informações do WebSocket de uma sessão
async function getWebsocketInfo(sessionId) {
  console.log(`\n=== Obtendo informações do WebSocket da sessão: ${sessionId} ===`);
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/sessions/${sessionId}/websocket`);
    
    console.log('✅ Informações do WebSocket obtidas com sucesso!');
    console.log('ID da sessão:', response.data.sessionId);
    console.log('URL do WebSocket:', response.data.websocketUrl);
    console.log('Path do WebSocket:', response.data.websocketPath);
    console.log('Nome do serviço:', response.data.serviceName);
    console.log('Kubernetes:', response.data.kubernetes);
    console.log('WebSocket:', response.data.websocket);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao obter informações do WebSocket:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    return null;
  }
}

// Função para excluir uma sessão
async function deleteSession(sessionId) {
  console.log(`\n=== Excluindo sessão: ${sessionId} ===`);
  
  try {
    const response = await axios.delete(`${SERVER_URL}/api/sessions/${sessionId}`);
    
    console.log('✅ Sessão excluída com sucesso!');
    console.log('Mensagem:', response.data.message);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao excluir sessão:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
    return false;
  }
}

// Função para verificar o pod no Kubernetes
async function checkKubernetesPod(sessionId) {
  console.log(`\n=== Verificando pod no Kubernetes para a sessão: ${sessionId} ===`);
  
  try {
    // Executar comando kubectl para verificar o pod
    const { exec } = require(require('path').resolve(__dirname, '../../node_modules/child_process'));
    
    return new Promise((resolve, reject) => {
      exec(`kubectl get pods -n gamgui -l session_id=${sessionId}`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erro ao verificar pod no Kubernetes:');
          console.error('Erro:', error.message);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.error('❌ Erro ao verificar pod no Kubernetes:');
          console.error('Stderr:', stderr);
          reject(new Error(stderr));
          return;
        }
        
        console.log('✅ Pod verificado com sucesso!');
        console.log(stdout);
        resolve(stdout);
      });
    });
  } catch (error) {
    console.error('❌ Erro ao verificar pod no Kubernetes:');
    console.error('Erro:', error.message);
    return null;
  }
}

// Função principal
async function main() {
  console.log('=== Teste de Criação de Sessão no GAMGUI ===');
  console.log('URL do servidor:', SERVER_URL);
  
  // Criar uma sessão
  const sessionId = await createSession();
  
  if (!sessionId) {
    console.error('❌ Não foi possível criar a sessão. Encerrando o teste.');
    return;
  }
  
  // Aguardar um pouco para garantir que a sessão seja criada
  console.log('\nAguardando 5 segundos para garantir que a sessão seja criada...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Obter informações da sessão
  await getSession(sessionId);
  
  // Obter informações do WebSocket
  await getWebsocketInfo(sessionId);
  
  // Verificar o pod no Kubernetes
  await checkKubernetesPod(sessionId);
  
  // Perguntar se deseja excluir a sessão
  const readline = require(require('path').resolve(__dirname, '../../node_modules/readline')).createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\nDeseja excluir a sessão? (s/n) ', async (answer) => {
    if (answer.toLowerCase() === 's') {
      await deleteSession(sessionId);
    } else {
      console.log('Sessão mantida.');
    }
    
    readline.close();
    console.log('\n=== Teste concluído ===');
  });
}

// Executar a função principal
main().catch(error => {
  console.error('Erro não tratado:', error);
});
