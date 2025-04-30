/**
 * Script para corrigir o problema de inicialização do KubernetesAdapter
 */
const fs = require(require('path').resolve(__dirname, '../../../node_modules/fs'));
const path = require(require('path').resolve(__dirname, '../../../node_modules/path'));

// Caminho para o arquivo KubernetesAdapter.js
const adapterPath = path.join(__dirname, 'gamgui-app', 'gamgui-server', 'services', 'container', 'KubernetesAdapter.js');

// Ler o conteúdo do arquivo
console.log(`Lendo arquivo: ${adapterPath}`);
const content = fs.readFileSync(adapterPath, 'utf8');

// Verificar se o arquivo contém o método _initializeK8sClient
if (!content.includes('_initializeK8sClient')) {
  console.error('O arquivo não contém o método _initializeK8sClient. Verifique o caminho do arquivo.');
  process.exit(1);
}

// Modificar o construtor para garantir que a inicialização seja síncrona
const modifiedContent = content.replace(
  /constructor\(config, logger, websocketAdapter = null\) {([^}]*)this\._initializeK8sClient\(\);([^}]*)\}/s,
  `constructor(config, logger, websocketAdapter = null) {$1
    // Inicializar Kubernetes client de forma síncrona
    try {
      this._initializeK8sClientSync();
      this.logger.info('Kubernetes client inicializado com sucesso no construtor');
    } catch (error) {
      this.logger.error('Erro ao inicializar Kubernetes client no construtor:', error);
      throw new ContainerError('Falha na inicialização do Kubernetes client', { cause: error });
    }$2}`
);

// Adicionar o método _initializeK8sClientSync
const syncInitMethod = `
  /**
   * Initialize Kubernetes client using GCP authentication (synchronous version)
   * @private
   */
  _initializeK8sClientSync() {
    this.logger.info('Inicializando Kubernetes client de forma síncrona');
    this.kc = new k8s.KubeConfig();
    
    // Get GKE cluster info from environment variables
    const clusterName = process.env.GKE_CLUSTER_NAME;
    const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
    const projectId = process.env.PROJECT_ID;
    
    if (!clusterName || !clusterLocation || !projectId) {
      this.logger.error('Missing required environment variables for GKE cluster');
      throw new Error('Missing required environment variables for GKE cluster');
    }
    
    this.logger.info(\`Inicializando Kubernetes client para cluster GKE \${clusterName} em \${clusterLocation}\`);
    
    // Use execSync para obter o token de acesso GCP
    const { execSync } = require(require('path').resolve(__dirname, '../../../node_modules/child_process'));
    const tokenCommand = \`gcloud auth print-access-token --project=\${projectId}\`;
    const accessToken = execSync(tokenCommand).toString().trim();
    
    if (!accessToken) {
      this.logger.error('Failed to get GCP access token using gcloud');
      throw new Error('Failed to get GCP access token using gcloud');
    }
    
    this.logger.info('Token de acesso GCP obtido com sucesso');
    
    // Get cluster endpoint
    const clusterInfoCommand = \`gcloud container clusters describe \${clusterName} --region=\${clusterLocation} --project=\${projectId} --format="json(endpoint,masterAuth.clusterCaCertificate)"\`;
    const clusterInfoJson = execSync(clusterInfoCommand).toString();
    const clusterInfo = JSON.parse(clusterInfoJson);
    
    if (!clusterInfo.endpoint || !clusterInfo.masterAuth.clusterCaCertificate) {
      this.logger.error('Failed to get GKE cluster endpoint or CA certificate');
      throw new Error('Failed to get GKE cluster endpoint or CA certificate');
    }
    
    // Configure KubeConfig manually
    this.kc.loadFromOptions({
      clusters: [{
        name: 'gke-cluster',
        server: \`https://\${clusterInfo.endpoint}\`,
        caData: clusterInfo.masterAuth.clusterCaCertificate,
        skipTLSVerify: false
      }],
      users: [{
        name: 'gcp-user',
        token: accessToken
      }],
      contexts: [{
        name: 'gke-context',
        cluster: 'gke-cluster',
        user: 'gcp-user'
      }],
      currentContext: 'gke-context'
    });
    
    // Create API clients
    this.k8sCoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
    this.k8sNetworkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
    
    this.logger.info('Kubernetes API clients criados com sucesso');
    
    // Test connection
    try {
      const namespaces = execSync(\`kubectl get namespaces -o json --context=gke-context\`).toString();
      const namespacesObj = JSON.parse(namespaces);
      this.logger.info(\`Conectado com sucesso ao cluster Kubernetes. Encontrados \${namespacesObj.items.length} namespaces.\`);
    } catch (testError) {
      this.logger.error('Falha ao testar conexão com o cluster Kubernetes:', testError);
      throw testError;
    }
  }`;

// Adicionar o método _initializeK8sClientSync antes do método _buildPodTemplate
const finalContent = modifiedContent.replace(
  /(\s+)\/\*\*\s+\* Build the Pod specification object/,
  `${syncInitMethod}$1\n\n  /**\n   * Build the Pod specification object`
);

// Escrever o conteúdo modificado de volta para o arquivo
console.log('Escrevendo arquivo modificado...');
fs.writeFileSync(adapterPath, finalContent, 'utf8');

console.log('Arquivo modificado com sucesso!');
