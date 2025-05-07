/**
 * Script para corrigir o formato da resposta da API
 */
const fs = require(require('path').resolve(__dirname, '../../../node_modules/fs'));
const path = require(require('path').resolve(__dirname, '../../../node_modules/path'));

// Caminho para o arquivo de rotas de sessão
const sessionRoutesPath = path.join(__dirname, 'gamgui-app', 'gamgui-server', 'routes', 'sessionRoutes.js');

// Ler o conteúdo do arquivo
console.log(`Lendo arquivo: ${sessionRoutesPath}`);
const content = fs.readFileSync(sessionRoutesPath, 'utf8');

// Modificar a resposta da API para incluir os campos necessários
const modifiedContent = content.replace(
  /router\.post\('\/'\s*,\s*async\s*\(req,\s*res\)\s*=>\s*{([^}]*)}\s*\);/s,
  `router.post('/', async (req, res) => {$1
    // Adicionar campos necessários na resposta
    const responseData = {
      sessionId: req.body.name,
      type: req.body.type,
      status: 'creating',
      ...result
    };
    res.json(responseData);
  });`
);

// Modificar a resposta da API para obter o status da sessão
const finalContent = modifiedContent.replace(
  /router\.get\('\/:sessionId'\s*,\s*async\s*\(req,\s*res\)\s*=>\s*{([^}]*)}\s*\);/s,
  `router.get('/:sessionId', async (req, res) => {$1
    // Adicionar campos necessários na resposta
    const responseData = {
      sessionId: req.params.sessionId,
      type: 'kubernetes',
      status: result?.phase === 'Running' ? 'ready' : 'creating',
      ...result
    };
    res.json(responseData);
  });`
);

// Escrever o conteúdo modificado de volta para o arquivo
console.log('Escrevendo arquivo modificado...');
fs.writeFileSync(sessionRoutesPath, finalContent, 'utf8');

console.log('Arquivo modificado com sucesso!');

// Caminho para o arquivo de serviço de sessão
const sessionServicePath = path.join(__dirname, 'gamgui-app', 'gamgui-server', 'services', 'SessionService.js');

// Ler o conteúdo do arquivo
console.log(`Lendo arquivo: ${sessionServicePath}`);
let sessionServiceContent = '';
try {
  sessionServiceContent = fs.readFileSync(sessionServicePath, 'utf8');
} catch (error) {
  console.error(`Erro ao ler o arquivo ${sessionServicePath}: ${error.message}`);
  process.exit(1);
}

// Modificar o método getStatus para retornar o status correto
const modifiedSessionServiceContent = sessionServiceContent.replace(
  /async getStatus\(sessionId\) {([^}]*)}/s,
  `async getStatus(sessionId) {
    try {
      const containerStatus = await this.containerService.getStatus(sessionId);
      
      // Mapear o status do container para o status da sessão
      let status = 'creating';
      if (containerStatus && containerStatus.phase) {
        if (containerStatus.phase === 'Running') {
          status = 'ready';
        } else if (containerStatus.phase === 'Failed' || containerStatus.phase === 'Unknown') {
          status = 'error';
        } else if (containerStatus.phase === 'NotFound') {
          status = 'deleted';
        }
      }
      
      return {
        sessionId,
        status,
        containerStatus
      };
    } catch (error) {
      this.logger.error(\`Error getting status for session \${sessionId}: \${error.message}\`);
      throw error;
    }
  }`
);

// Escrever o conteúdo modificado de volta para o arquivo
console.log('Escrevendo arquivo de serviço modificado...');
fs.writeFileSync(sessionServicePath, modifiedSessionServiceContent, 'utf8');

console.log('Arquivo de serviço modificado com sucesso!');
