export interface ApiConfig {
  apiUrl: string;
  socketUrl: string;
}

export const getApiConfig = (): ApiConfig => {
  const currentHost = window.location.host;
  
  // Development environment
  if (currentHost.includes('localhost')) {
    return {
      apiUrl: 'http://localhost:3001/api',
      socketUrl: 'http://localhost:3001'
    };
  }
  
  // Production: Auto-detect project number from current URL
  const match = currentHost.match(/gamgui-client-(\d+)/);
  if (match) {
    const projectNumber = match[1];
    const region = currentHost.includes('us-central1') ? 'us-central1' : 'uc';
    return {
      apiUrl: `https://gamgui-server-${projectNumber}.${region}.run.app/api`,
      socketUrl: `wss://gamgui-server-${projectNumber}.${region}.run.app`
    };
  }
  
  // Fallback configuration
  console.warn('Could not auto-detect configuration, using fallback');
  return {
    apiUrl: '/api',
    socketUrl: window.location.origin.replace('http', 'ws')
  };
};

// Add configuration validation
export const validateConfig = (config: ApiConfig): void => {
  if (!config.apiUrl || !config.socketUrl) {
    throw new Error('Invalid configuration detected');
  }
};

// Add configuration logging for debugging
export const logConfig = (): void => {
  const config = getApiConfig();
  console.log('GAMGUI Client Config:', {
    environment: process.env.NODE_ENV,
    currentHost: window.location.host,
    detectedConfig: config
  });
};
