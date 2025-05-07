/**
* Script para testar a nova implementação do KubernetesAdapter com autenticação GCP direta
 */
const axios = require(require('path').resolve(__dirname, '../../node_modules/axios'));
const { v4: uuidv4 } = require(require('path').resolve(__dirname, '../../node_modules/uuid'));

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
  const sessionId = `test-session-${uuidv4().substring(0, 8)}`;
  log(YELLOW, `\n=== Criando sessão: ${sessionId} ===`);

  try {
    const response = await axios.post(`${SERVER_URL}/api/sessions`, {
      name: sessionId,
      type: 'kubernetes'
    });

    if (response.status === 200 || response.status === 201) {
      log(GREEN, '✅ Sessão criada com sucesso!');
      
      // Extrair informações da sessão do formato atual da resposta
      const sessionData = response.data.session || {};
      
      log(GREEN, `ID da sessão: ${sessionData.id}`);
      log(GREEN, `Nome da sessão: ${sessionData.name}`);
      log(GREEN, `Status da sessão: ${sessionData.status}`);

      return {
        success: true,
        sessionId: sessionData.name || sessionId,
        data: sessionData
      };
    } else {
      log(RED, `❌ Erro ao criar sessão: Status ${response.status}`);
      log(RED, `Dados: ${JSON.stringify(response.data, null, 2)}`);

      return {
        success: false,
        sessionId,
        error: response.data
      };
    }
  } catch (error) {
    log(RED, '❌ Erro ao criar sessão:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      sessionId,
      error: error.response?.data || error.message
    };
  }
}

// Função para obter o status de uma sessão
async function getSessionStatus(sessionId) {
  log(YELLOW, `\n=== Obtendo status da sessão: ${sessionId} ===`);

  try {
    const response = await axios.get(`${SERVER_URL}/api/sessions/${sessionId}`);

    if (response.status === 200) {
      log(GREEN, '✅ Status obtido com sucesso!');
      
      // Extrair informações da sessão do formato atual da resposta
      const sessionData = response.data.session || {};
      
      log(GREEN, `ID da sessão: ${sessionData.id}`);
      log(GREEN, `Nome da sessão: ${sessionData.name}`);
      log(GREEN, `Status da sessão: ${sessionData.status}`);

      // Mapear o status da sessão para o formato esperado pelo teste
      let status = 'creating';
      if (sessionData.status === 'active' || sessionData.status === 'running') {
        status = 'ready';
      } else if (sessionData.status === 'error' || sessionData.status === 'failed') {
        status = 'error';
      }

      return {
        success: true,
        data: {
          ...sessionData,
          status
        }
      };
    } else {
      log(RED, `❌ Erro ao obter status: Status ${response.status}`);
      log(RED, `Dados: ${JSON.stringify(response.data, null, 2)}`);

      return {
        success: false,
        error: response.data
      };
    }
  } catch (error) {
    log(RED, '❌ Erro ao obter status:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Função para executar um comando em uma sessão
async function executeCommand(sessionId, command) {
  log(YELLOW, `\n=== Executando comando na sessão: ${sessionId} ===`);
  log(YELLOW, `Comando: ${command}`);

  try {
    const response = await axios.post(`${SERVER_URL}/api/sessions/${sessionId}/execute`, {
      command
    });

    if (response.status === 200) {
      log(GREEN, '✅ Comando executado com sucesso!');
      log(GREEN, 'Saída:');
      console.log(response.data.stdout || response.data.output || '');

      if (response.data.stderr) {
        log(YELLOW, 'Erro:');
        console.log(response.data.stderr);
      }

      return {
        success: true,
        data: response.data
      };
    } else {
      log(RED, `❌ Erro ao executar comando: Status ${response.status}`);
      log(RED, `Dados: ${JSON.stringify(response.data, null, 2)}`);

      return {
        success: false,
        error: response.data
      };
    }
  } catch (error) {
    log(RED, '❌ Erro ao executar comando:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Função para excluir uma sessão
async function deleteSession(sessionId) {
  log(YELLOW, `\n=== Excluindo sessão: ${sessionId} ===`);

  try {
    const response = await axios.delete(`${SERVER_URL}/api/sessions/${sessionId}`);

    if (response.status === 200 || response.status === 204) {
      log(GREEN, '✅ Sessão excluída com sucesso!');

      return {
        success: true
      };
    } else {
      log(RED, `❌ Erro ao excluir sessão: Status ${response.status}`);
      log(RED, `Dados: ${JSON.stringify(response.data, null, 2)}`);

      return {
        success: false,
        error: response.data
      };
    }
  } catch (error) {
    log(RED, '❌ Erro ao excluir sessão:');
    log(RED, `Status: ${error.response?.status || 'Desconhecido'}`);
    log(RED, `Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Função principal
async function main() {
  log(GREEN, '=== Teste do KubernetesAdapter com Autenticação GCP Direta ===');
  log(GREEN, `URL do servidor: ${SERVER_URL}`);

  // Criar sessão
  const createResult = await createSession();

  if (!createResult.success) {
    log(RED, '❌ Não foi possível criar a sessão. Encerrando o teste.');
    return;
  }

  // Usar o ID da sessão retornado pela API, não o nome da sessão
  const sessionId = createResult.data.id;
  log(GREEN, `Usando ID da sessão para consultas: ${sessionId}`);

  // Aguardar a sessão ficar pronta
  log(YELLOW, '\n=== Aguardando a sessão ficar pronta ===');
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isReady && attempts < maxAttempts) {
    attempts++;
    log(YELLOW, `Tentativa ${attempts}/${maxAttempts}...`);

    // Aguardar 5 segundos
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verificar o status da sessão
    const statusResult = await getSessionStatus(sessionId);

    if (statusResult.success && statusResult.data.status === 'ready') {
      isReady = true;
      log(GREEN, '✅ Sessão está pronta!');
    } else if (statusResult.success) {
      log(YELLOW, `Sessão ainda não está pronta. Status atual: ${statusResult.data.status}`);
    } else {
      log(RED, '❌ Erro ao verificar o status da sessão.');
    }
  }

  if (!isReady) {
    log(RED, '❌ A sessão não ficou pronta após várias tentativas. Encerrando o teste.');

    // Tentar excluir a sessão
    await deleteSession(sessionId);

    return;
  }

  // Executar um comando simples
  await executeCommand(sessionId, 'echo "Hello, World!"');

  // Executar um comando GAM
  await executeCommand(sessionId, '/gam/gam7/gam info domain');

  // Excluir a sessão
  await deleteSession(sessionId);

  log(GREEN, '\n=== Teste concluído ===');
}

// Executar a função principal
main().catch(error => {
  log(RED, `Erro não tratado: ${error.message}`);
  process.exit(1);
});
