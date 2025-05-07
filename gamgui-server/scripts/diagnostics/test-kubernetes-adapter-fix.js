/**
 * Script para testar se a correção do adaptador Kubernetes funcionou
 * Este script tenta criar uma sessão e verificar se ela foi criada com sucesso
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Cores para saída
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Função para imprimir mensagens coloridas
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// URL do servidor
const SERVER_URL = process.env.SERVER_URL || 'https://gamgui-server-vthtec4m3a-uc.a.run.app';

// Função para criar uma sessão
async function createSession() {
  log(YELLOW, '\n=== Criando uma nova sessão ===');
  
  const sessionName = `test-session-${Math.random().toString(36).substring(2, 10)}`;
  log(YELLOW, `Nome da sessão: ${sessionName}`);
  
  try {
    const response = await axios.post(`${SERVER_URL}/api/sessions`, {
      name: sessionName,
      imageId: 'default-gam-image'
    });
    
    if (response.status === 200 || response.status === 201) {
      log(GREEN, '✅ Sessão criada com sucesso');
      log(GREEN, `ID da sessão: ${response.data.id}`);
      log(GREEN, `Nome da sessão: ${response.data.name}`);
      log(GREEN, `Status da sessão: ${response.data.status}`);
      return response.data;
    } else {
      log(RED, `❌ Erro ao criar sessão: Status ${response.status}`);
      log(RED, `Resposta: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(RED, '❌ Erro ao criar sessão:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Mensagem: ${error.message}`);
    log(RED, `Detalhes: ${JSON.stringify(error.response?.data || {})}`);
    return null;
  }
}

// Função para executar um comando GAM
async function executeGamCommand(sessionId, command) {
  log(YELLOW, `\n=== Executando comando GAM na sessão ${sessionId} ===`);
  log(YELLOW, `Comando: ${command}`);
  
  try {
    const response = await axios.post(`${SERVER_URL}/api/sessions/${sessionId}/execute`, {
      command
    });
    
    if (response.status === 200) {
      log(GREEN, '✅ Comando executado com sucesso');
      log(GREEN, `Saída: ${response.data.stdout}`);
      return response.data;
    } else {
      log(RED, `❌ Erro ao executar comando: Status ${response.status}`);
      log(RED, `Resposta: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log(RED, '❌ Erro ao executar comando:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Mensagem: ${error.message}`);
    log(RED, `Detalhes: ${JSON.stringify(error.response?.data || {})}`);
    return null;
  }
}

// Função para excluir uma sessão
async function deleteSession(sessionId) {
  log(YELLOW, `\n=== Excluindo sessão ${sessionId} ===`);
  
  try {
    const response = await axios.delete(`${SERVER_URL}/api/sessions/${sessionId}`);
    
    if (response.status === 200 || response.status === 204) {
      log(GREEN, '✅ Sessão excluída com sucesso');
      return true;
    } else {
      log(RED, `❌ Erro ao excluir sessão: Status ${response.status}`);
      log(RED, `Resposta: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log(RED, '❌ Erro ao excluir sessão:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Mensagem: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  log(GREEN, '=== Teste da Correção do Adaptador Kubernetes ===');
  
  // Criar uma sessão
  const session = await createSession();
  
  if (!session) {
    log(RED, '\n❌ Teste falhou: Não foi possível criar uma sessão');
    return;
  }
  
  // Aguardar um pouco para a sessão ser inicializada
  log(YELLOW, '\nAguardando 10 segundos para a sessão ser inicializada...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Executar um comando GAM simples
  const commandResult = await executeGamCommand(session.id, 'info domain');
  
  if (!commandResult) {
    log(RED, '\n❌ Teste falhou: Não foi possível executar o comando GAM');
    
    // Tentar excluir a sessão mesmo se o teste falhar
    await deleteSession(session.id);
    return;
  }
  
  // Excluir a sessão
  const deleteResult = await deleteSession(session.id);
  
  if (!deleteResult) {
    log(RED, '\n⚠️ Aviso: Não foi possível excluir a sessão');
  }
  
  // Resultado final
  if (session && commandResult) {
    log(GREEN, '\n✅ Teste concluído com sucesso!');
    log(GREEN, 'A correção do adaptador Kubernetes funcionou corretamente.');
  } else {
    log(RED, '\n❌ Teste falhou!');
    log(RED, 'A correção do adaptador Kubernetes não funcionou corretamente.');
  }
}

// Executar a função principal
main().catch(error => {
  log(RED, `\nErro não tratado: ${error.message}`);
  process.exit(1);
});
