/**
 * Script para diagnosticar problemas com comandos básicos de terminal
 * Verifica a execução de comandos básicos como ls, cd, etc.
 */
const { Readable, Writable } = require('stream');
const ContainerFactory = require('../../services/container/ContainerFactory');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// Cores para saída
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Função para imprimir mensagens coloridas
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// Função para criar uma sessão de teste
async function createTestSession() {
  log(YELLOW, '\n=== Criando sessão de teste ===');
  
  try {
    // Criar serviço de contêiner
    const containerService = ContainerFactory.createContainerService(config, logger);
    
    // Gerar ID de sessão de teste
    const sessionId = `test-${Date.now()}`;
    log(YELLOW, `ID da sessão: ${sessionId}`);
    
    // Criar contêiner
    log(YELLOW, 'Criando contêiner...');
    const container = await containerService.createContainer(sessionId, {
      credentialsSecret: 'gam-credentials'
    });
    
    log(GREEN, `✅ Contêiner criado com sucesso: ${container.podName}`);
    
    return { sessionId, containerService };
  } catch (error) {
    log(RED, `❌ Erro ao criar sessão de teste: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return null;
  }
}

// Função para excluir a sessão de teste
async function deleteTestSession(sessionId, containerService) {
  log(YELLOW, `\n=== Excluindo sessão de teste ${sessionId} ===`);
  
  try {
    await containerService.deleteContainer(sessionId);
    log(GREEN, `✅ Sessão de teste excluída com sucesso`);
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao excluir sessão de teste: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para testar um comando
async function testCommand(sessionId, containerService, command) {
  log(YELLOW, `\n=== Testando comando: ${command} ===`);
  
  try {
    // Executar o comando
    const result = await containerService.executeCommand(sessionId, command);
    
    // Verificar o resultado
    if (result.stdout) {
      log(GREEN, `✅ Comando executado com sucesso`);
      log(GREEN, `Saída: ${result.stdout}`);
    } else {
      log(YELLOW, `⚠️ Comando executado, mas sem saída`);
    }
    
    if (result.stderr) {
      log(RED, `⚠️ Erro: ${result.stderr}`);
    }
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao executar comando: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para testar um comando GAM
async function testGamCommand(sessionId, containerService, command) {
  log(YELLOW, `\n=== Testando comando GAM: ${command} ===`);
  
  try {
    // Criar streams para capturar a saída
    let stdout = '';
    let stderr = '';
    
    // Executar o comando GAM
    await containerService.executeGamCommand(sessionId, command, {
      onStdout: (data) => { stdout += data.toString(); },
      onStderr: (data) => { stderr += data.toString(); },
      onClose: (code) => {
        if (code === 0) {
          log(GREEN, `✅ Comando GAM executado com sucesso (código ${code})`);
        } else {
          log(RED, `❌ Comando GAM falhou com código ${code}`);
        }
      },
      onError: (err) => {
        log(RED, `❌ Erro ao executar comando GAM: ${err.message}`);
      }
    });
    
    // Aguardar um pouco para a execução ser concluída
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar o resultado
    if (stdout) {
      log(GREEN, `Saída: ${stdout}`);
    }
    
    if (stderr) {
      log(RED, `Erro: ${stderr}`);
    }
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao executar comando GAM: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para verificar a implementação do TerminalService
function checkTerminalServiceImplementation() {
  log(YELLOW, '\n=== Verificando implementação do TerminalService ===');
  
  try {
    // Carregar o TerminalService
    const TerminalService = require('../../services/terminal/TerminalService');
    
    // Verificar se os métodos necessários estão implementados
    const methods = [
      'createTerminalStreams',
      'processCommand',
      '_handleLsCommand',
      '_handleCdCommand',
      '_handlePwdCommand',
      '_handleCatCommand',
      '_handleEchoCommand'
    ];
    
    let allMethodsImplemented = true;
    
    for (const method of methods) {
      if (typeof TerminalService.prototype[method] === 'function') {
        log(GREEN, `✅ Método ${method} implementado`);
      } else {
        log(RED, `❌ Método ${method} não implementado`);
        allMethodsImplemented = false;
      }
    }
    
    // Verificar se o TerminalService registra os comandos básicos
    const terminalServiceCode = require('fs').readFileSync(require.resolve('../../services/terminal/TerminalService'), 'utf8');
    
    const basicCommands = ['ls', 'cd', 'pwd', 'cat', 'echo'];
    
    for (const command of basicCommands) {
      if (terminalServiceCode.includes(`'${command}'`)) {
        log(GREEN, `✅ Comando ${command} registrado no TerminalService`);
      } else {
        log(RED, `❌ Comando ${command} não registrado no TerminalService`);
        allMethodsImplemented = false;
      }
    }
    
    return allMethodsImplemented;
  } catch (error) {
    log(RED, `❌ Erro ao verificar implementação do TerminalService: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para verificar a implementação do CommandService
function checkCommandServiceImplementation() {
  log(YELLOW, '\n=== Verificando implementação do CommandService ===');
  
  try {
    // Carregar o CommandService
    const CommandService = require('../../services/terminal/CommandService');
    
    // Verificar se os métodos necessários estão implementados
    const methods = [
      'executeCommand',
      'executeGamCommand',
      'executeBashScript',
      'uploadFile',
      'downloadFile'
    ];
    
    let allMethodsImplemented = true;
    
    for (const method of methods) {
      if (typeof CommandService.prototype[method] === 'function') {
        log(GREEN, `✅ Método ${method} implementado`);
      } else {
        log(RED, `❌ Método ${method} não implementado`);
        allMethodsImplemented = false;
      }
    }
    
    return allMethodsImplemented;
  } catch (error) {
    log(RED, `❌ Erro ao verificar implementação do CommandService: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para verificar a integração entre TerminalService e CommandService
function checkTerminalCommandServiceIntegration() {
  log(YELLOW, '\n=== Verificando integração entre TerminalService e CommandService ===');
  
  try {
    // Carregar os serviços
    const TerminalService = require('../../services/terminal/TerminalService');
    const CommandService = require('../../services/terminal/CommandService');
    
    // Verificar se o TerminalService usa o CommandService
    const terminalServiceCode = require('fs').readFileSync(require.resolve('../../services/terminal/TerminalService'), 'utf8');
    
    if (terminalServiceCode.includes('this.commandService.executeCommand')) {
      log(GREEN, `✅ TerminalService usa CommandService.executeCommand`);
    } else {
      log(RED, `❌ TerminalService não usa CommandService.executeCommand`);
      return false;
    }
    
    if (terminalServiceCode.includes('this.commandService.executeGamCommand')) {
      log(GREEN, `✅ TerminalService usa CommandService.executeGamCommand`);
    } else {
      log(RED, `❌ TerminalService não usa CommandService.executeGamCommand`);
      return false;
    }
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao verificar integração entre TerminalService e CommandService: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para verificar a integração entre CommandService e ContainerService
function checkCommandContainerServiceIntegration() {
  log(YELLOW, '\n=== Verificando integração entre CommandService e ContainerService ===');
  
  try {
    // Carregar o CommandService
    const CommandService = require('../../services/terminal/CommandService');
    
    // Verificar se o CommandService usa o ContainerService
    const commandServiceCode = require('fs').readFileSync(require.resolve('../../services/terminal/CommandService'), 'utf8');
    
    if (commandServiceCode.includes('this.containerService.executeCommand')) {
      log(GREEN, `✅ CommandService usa ContainerService.executeCommand`);
    } else {
      log(RED, `❌ CommandService não usa ContainerService.executeCommand`);
      return false;
    }
    
    if (commandServiceCode.includes('this.containerService.executeGamCommand')) {
      log(GREEN, `✅ CommandService usa ContainerService.executeGamCommand`);
    } else {
      log(YELLOW, `⚠️ CommandService não usa ContainerService.executeGamCommand (pode estar usando executeCommand)`);
    }
    
    return true;
  } catch (error) {
    log(RED, `❌ Erro ao verificar integração entre CommandService e ContainerService: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função para verificar a implementação do KubernetesAdapter
function checkKubernetesAdapterImplementation() {
  log(YELLOW, '\n=== Verificando implementação do KubernetesAdapter ===');
  
  try {
    // Carregar o KubernetesAdapter
    const KubernetesAdapter = require('../../services/container/adapters/KubernetesAdapter-cloud-run');
    
    // Verificar se os métodos necessários estão implementados
    const methods = [
      'executeCommand',
      'executeGamCommand',
      'createContainer',
      'deleteContainer',
      'uploadFile',
      'downloadFile'
    ];
    
    let allMethodsImplemented = true;
    
    for (const method of methods) {
      if (typeof KubernetesAdapter.prototype[method] === 'function') {
        log(GREEN, `✅ Método ${method} implementado`);
      } else {
        log(RED, `❌ Método ${method} não implementado`);
        allMethodsImplemented = false;
      }
    }
    
    return allMethodsImplemented;
  } catch (error) {
    log(RED, `❌ Erro ao verificar implementação do KubernetesAdapter: ${error.message}`);
    if (error.stack) {
      log(RED, error.stack);
    }
    return false;
  }
}

// Função principal
async function main() {
  log(GREEN, '=== Diagnóstico de Comandos de Terminal ===');
  
  // Verificar implementação do TerminalService
  const terminalServiceOk = checkTerminalServiceImplementation();
  
  // Verificar implementação do CommandService
  const commandServiceOk = checkCommandServiceImplementation();
  
  // Verificar integração entre TerminalService e CommandService
  const terminalCommandIntegrationOk = checkTerminalCommandServiceIntegration();
  
  // Verificar integração entre CommandService e ContainerService
  const commandContainerIntegrationOk = checkCommandContainerServiceIntegration();
  
  // Verificar implementação do KubernetesAdapter
  const kubernetesAdapterOk = checkKubernetesAdapterImplementation();
  
  // Criar sessão de teste
  const testSession = await createTestSession();
  
  if (testSession) {
    const { sessionId, containerService } = testSession;
    
    // Testar comandos básicos
    const lsOk = await testCommand(sessionId, containerService, 'ls');
    const pwdOk = await testCommand(sessionId, containerService, 'pwd');
    const echoOk = await testCommand(sessionId, containerService, 'echo "Hello, World!"');
    const cdOk = await testCommand(sessionId, containerService, 'cd /gam && pwd');
    
    // Testar comando GAM
    const gamOk = await testGamCommand(sessionId, containerService, 'version');
    
    // Excluir sessão de teste
    await deleteTestSession(sessionId, containerService);
    
    // Resumo dos testes de comando
    log(YELLOW, '\n=== Resumo dos testes de comando ===');
    
    if (lsOk) {
      log(GREEN, `✅ Comando ls: OK`);
    } else {
      log(RED, `❌ Comando ls: FALHA`);
    }
    
    if (pwdOk) {
      log(GREEN, `✅ Comando pwd: OK`);
    } else {
      log(RED, `❌ Comando pwd: FALHA`);
    }
    
    if (echoOk) {
      log(GREEN, `✅ Comando echo: OK`);
    } else {
      log(RED, `❌ Comando echo: FALHA`);
    }
    
    if (cdOk) {
      log(GREEN, `✅ Comando cd: OK`);
    } else {
      log(RED, `❌ Comando cd: FALHA`);
    }
    
    if (gamOk) {
      log(GREEN, `✅ Comando GAM: OK`);
    } else {
      log(RED, `❌ Comando GAM: FALHA`);
    }
  }
  
  // Resumo geral
  log(YELLOW, '\n=== Resumo geral ===');
  
  if (terminalServiceOk) {
    log(GREEN, `✅ Implementação do TerminalService: OK`);
  } else {
    log(RED, `❌ Implementação do TerminalService: FALHA`);
  }
  
  if (commandServiceOk) {
    log(GREEN, `✅ Implementação do CommandService: OK`);
  } else {
    log(RED, `❌ Implementação do CommandService: FALHA`);
  }
  
  if (terminalCommandIntegrationOk) {
    log(GREEN, `✅ Integração TerminalService-CommandService: OK`);
  } else {
    log(RED, `❌ Integração TerminalService-CommandService: FALHA`);
  }
  
  if (commandContainerIntegrationOk) {
    log(GREEN, `✅ Integração CommandService-ContainerService: OK`);
  } else {
    log(RED, `❌ Integração CommandService-ContainerService: FALHA`);
  }
  
  if (kubernetesAdapterOk) {
    log(GREEN, `✅ Implementação do KubernetesAdapter: OK`);
  } else {
    log(RED, `❌ Implementação do KubernetesAdapter: FALHA`);
  }
  
  // Conclusão
  log(GREEN, '\n=== Diagnóstico concluído ===');
  
  if (!terminalServiceOk || !commandServiceOk || !terminalCommandIntegrationOk || !commandContainerIntegrationOk || !kubernetesAdapterOk) {
    log(RED, '\n❌ Problemas encontrados na implementação dos serviços. Corrija os problemas identificados acima.');
    
    // Sugestões de correção
    log(YELLOW, '\n=== Sugestões de correção ===');
    
    if (!terminalServiceOk) {
      log(YELLOW, '1. Verifique a implementação do TerminalService e certifique-se de que todos os métodos necessários estão implementados.');
      log(YELLOW, '   - Verifique se os comandos básicos (ls, cd, pwd, cat, echo) estão registrados no método _registerCommandHandlers.');
      log(YELLOW, '   - Verifique se os métodos de manipulação de comandos (_handleLsCommand, _handleCdCommand, etc.) estão implementados.');
    }
    
    if (!commandServiceOk) {
      log(YELLOW, '2. Verifique a implementação do CommandService e certifique-se de que todos os métodos necessários estão implementados.');
      log(YELLOW, '   - Verifique se os métodos executeCommand, executeGamCommand, etc. estão implementados.');
    }
    
    if (!terminalCommandIntegrationOk) {
      log(YELLOW, '3. Verifique a integração entre TerminalService e CommandService.');
      log(YELLOW, '   - Certifique-se de que o TerminalService está usando o CommandService para executar comandos.');
    }
    
    if (!commandContainerIntegrationOk) {
      log(YELLOW, '4. Verifique a integração entre CommandService e ContainerService.');
      log(YELLOW, '   - Certifique-se de que o CommandService está usando o ContainerService para executar comandos.');
    }
    
    if (!kubernetesAdapterOk) {
      log(YELLOW, '5. Verifique a implementação do KubernetesAdapter e certifique-se de que todos os métodos necessários estão implementados.');
      log(YELLOW, '   - Verifique se os métodos executeCommand, executeGamCommand, etc. estão implementados.');
    }
  } else {
    log(GREEN, '\n✅ Todos os serviços estão implementados corretamente.');
    
    if (testSession) {
      if (!lsOk || !pwdOk || !echoOk || !cdOk) {
        log(RED, '\n❌ Alguns comandos básicos falharam. Isso pode indicar um problema na execução de comandos no contêiner.');
        log(YELLOW, 'Verifique se o contêiner está sendo criado corretamente e se os comandos estão sendo executados corretamente.');
      } else if (!gamOk) {
        log(RED, '\n❌ O comando GAM falhou. Isso pode indicar um problema com a instalação do GAM no contêiner.');
        log(YELLOW, 'Verifique se o GAM está instalado corretamente no contêiner e se as credenciais estão configuradas corretamente.');
      } else {
        log(GREEN, '\n✅ Todos os comandos foram executados com sucesso.');
      }
    } else {
      log(RED, '\n❌ Não foi possível criar uma sessão de teste. Verifique a conexão com o Kubernetes.');
    }
  }
}

// Executar a função principal
main().catch(error => {
  log(RED, `\nErro não tratado: ${error.message}`);
  if (error.stack) {
    log(RED, error.stack);
  }
  process.exit(1);
});
