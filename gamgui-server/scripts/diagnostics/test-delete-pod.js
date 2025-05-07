/**
 * Script para testar a exclusão de pods no Kubernetes
 */
const k8s = require(require('path').resolve(__dirname, '../../node_modules/@kubernetes/client-node'));
const { Writable } = require(require('path').resolve(__dirname, '../../node_modules/stream'));

// Configuração do cliente Kubernetes
const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // Carrega a configuração padrão do Kubernetes

// Namespace onde os pods estão sendo criados
const namespace = 'gamgui';

// Função para listar todos os pods no namespace
async function listPods() {
  try {
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    const response = await k8sCoreV1Api.listNamespacedPod(namespace);
    
    console.log(`\n=== Pods no namespace ${namespace} ===`);
    if (response.body.items.length === 0) {
      console.log('Nenhum pod encontrado.');
      return [];
    }
    
    response.body.items.forEach(pod => {
      console.log(`- ${pod.metadata.name} (Status: ${pod.status.phase})`);
    });
    
    return response.body.items;
  } catch (error) {
    console.error('Erro ao listar pods:', error.message);
    return [];
  }
}

// Função para excluir um pod pelo nome
async function deletePod(podName) {
  try {
    console.log(`\n=== Excluindo pod ${podName} ===`);
    const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    const response = await k8sCoreV1Api.deleteNamespacedPod(podName, namespace);
    console.log(`Pod ${podName} excluído com sucesso.`);
    return true;
  } catch (error) {
    if (error.response && error.response.statusCode === 404) {
      console.warn(`Pod ${podName} não encontrado para exclusão.`);
      return false;
    }
    console.error(`Erro ao excluir pod ${podName}:`, error.message);
    return false;
  }
}

// Função para executar um comando em um pod
async function executeCommand(podName, command) {
  try {
    console.log(`\n=== Executando comando no pod ${podName} ===`);
    console.log(`Comando: ${command}`);
    
    const exec = new k8s.Exec(kc);
    
    // Criar streams para stdout e stderr
    let stdout = '';
    let stderr = '';
    
    // Criar streams Writable para capturar a saída
    const stdoutStream = new Writable({
      write(chunk, encoding, callback) {
        stdout += chunk.toString();
        callback();
      }
    });
    
    const stderrStream = new Writable({
      write(chunk, encoding, callback) {
        stderr += chunk.toString();
        callback();
      }
    });
    
    // Executar o comando
    return new Promise((resolve, reject) => {
      const commandArray = ['/bin/bash', '-c', command];
      
      exec.exec(
        namespace,
        podName,
        'gam', // Nome do contêiner dentro do pod
        commandArray,
        stdoutStream,
        stderrStream,
        null, // stdin - não interativo
        false, // tty - não necessário para comandos não interativos
        (status) => {
          console.log(`Status da execução: ${status.status}`);
          if (status.status === 'Success') {
            console.log('Comando executado com sucesso.');
            console.log('Saída:');
            console.log(stdout);
            
            if (stderr) {
              console.log('Erro:');
              console.log(stderr);
            }
            
            resolve({ stdout, stderr });
          } else {
            console.error(`Falha na execução do comando: ${status.status}`);
            reject(new Error(`Falha na execução do comando: ${status.status}`));
          }
        }
      );
    });
  } catch (error) {
    console.error(`Erro ao executar comando no pod ${podName}:`, error.message);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    // Listar todos os pods
    const pods = await listPods();
    
    if (pods.length === 0) {
      console.log('Nenhum pod para testar.');
      return;
    }
    
    // Perguntar ao usuário qual pod excluir
    const readline = require(require('path').resolve(__dirname, '../../node_modules/readline')).createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\nDigite o nome do pod para excluir (ou "todos" para excluir todos): ', async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() === 'todos') {
        console.log('\n=== Excluindo todos os pods ===');
        for (const pod of pods) {
          await deletePod(pod.metadata.name);
        }
      } else {
        // Verificar se o pod existe
        const podExists = pods.some(pod => pod.metadata.name === answer);
        
        if (podExists) {
          // Executar um comando simples antes de excluir
          try {
            await executeCommand(answer, 'echo "Teste antes da exclusão"');
          } catch (error) {
            console.error('Erro ao executar comando:', error.message);
          }
          
          // Excluir o pod
          await deletePod(answer);
        } else {
          console.error(`Pod ${answer} não encontrado.`);
        }
      }
      
      // Listar pods novamente para confirmar a exclusão
      await listPods();
    });
  } catch (error) {
    console.error('Erro no script:', error.message);
  }
}

// Executar a função principal
main();
