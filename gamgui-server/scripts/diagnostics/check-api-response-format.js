/**
 * Script para verificar o formato da resposta da API
 */
const axios = require(require('path').resolve(__dirname, '../../node_modules/axios'));
const { v4: uuidv4 } = require(require('path').resolve(__dirname, '../../node_modules/uuid'));

// URL do servidor
const SERVER_URL = process.env.SERVER_URL || 'https://gamgui-server-vthtec4m3a-uc.a.run.app';

// Função para criar uma sessão e mostrar a resposta completa
async function createSessionAndShowResponse() {
  const sessionId = `test-session-${uuidv4().substring(0, 8)}`;
  console.log(`\n=== Criando sessão: ${sessionId} ===`);

  try {
    const response = await axios.post(`${SERVER_URL}/api/sessions`, {
      name: sessionId,
      type: 'kubernetes'
    });

    console.log('Status da resposta:', response.status);
    console.log('Cabeçalhos da resposta:', JSON.stringify(response.headers, null, 2));
    console.log('Corpo da resposta:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      sessionId,
      data: response.data
    };
  } catch (error) {
    console.error('Erro ao criar sessão:');
    console.error(`Status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      sessionId,
      error: error.response?.data || error.message
    };
  }
}

// Função para obter o status de uma sessão e mostrar a resposta completa
async function getSessionStatusAndShowResponse(sessionId) {
  console.log(`\n=== Obtendo status da sessão: ${sessionId} ===`);

  try {
    const response = await axios.get(`${SERVER_URL}/api/sessions/${sessionId}`);

    console.log('Status da resposta:', response.status);
    console.log('Cabeçalhos da resposta:', JSON.stringify(response.headers, null, 2));
    console.log('Corpo da resposta:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Erro ao obter status:');
    console.error(`Status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Função para excluir uma sessão
async function deleteSession(sessionId) {
  console.log(`\n=== Excluindo sessão: ${sessionId} ===`);

  try {
    const response = await axios.delete(`${SERVER_URL}/api/sessions/${sessionId}`);

    console.log('Status da resposta:', response.status);
    console.log('Cabeçalhos da resposta:', JSON.stringify(response.headers, null, 2));
    console.log('Corpo da resposta:', JSON.stringify(response.data, null, 2));

    return {
      success: true
    };
  } catch (error) {
    console.error('Erro ao excluir sessão:');
    console.error(`Status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Dados: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Função principal
async function main() {
  console.log('=== Verificação do formato da resposta da API ===');
  console.log(`URL do servidor: ${SERVER_URL}`);

  // Criar sessão
  const createResult = await createSessionAndShowResponse();

  if (!createResult.success) {
    console.error('Não foi possível criar a sessão. Encerrando o teste.');
    return;
  }

  const sessionId = createResult.sessionId;

  // Aguardar 5 segundos
  console.log('\nAguardando 5 segundos...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verificar o status da sessão
  await getSessionStatusAndShowResponse(sessionId);

  // Excluir a sessão
  await deleteSession(sessionId);

  console.log('\n=== Verificação concluída ===');
}

// Executar a função principal
main().catch(error => {
  console.error(`Erro não tratado: ${error.message}`);
  process.exit(1);
});
