const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface AuthFiles {
  clientSecrets: File | null;
  oauth2: File | null;
  oauth2service: File | null;
}

export async function uploadCredentials(files: AuthFiles) {
  const formData = new FormData();
  
  if (files.clientSecrets) {
    formData.append('client_secrets', files.clientSecrets);
  }
  
  if (files.oauth2) {
    formData.append('oauth2', files.oauth2);
  }
  
  if (files.oauth2service) {
    formData.append('oauth2service', files.oauth2service);
  }
  
  const response = await fetch(`${API_BASE_URL}/credentials`, {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
}

export async function createImage(name: string) {
  const response = await fetch(`${API_BASE_URL}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  
  return response.json();
}

export async function checkCredentials() {
  const response = await fetch(`${API_BASE_URL}/credentials/check`);
  return response.json();
}

export async function deleteCredentials() {
  const response = await fetch(`${API_BASE_URL}/credentials`, {
    method: 'DELETE',
  });
  
  return response.json();
}

// Session management functions
export interface Session {
  id: string;
  name: string;
  containerId: string;
  containerName: string;
  imageId: string;
  imageName: string;
  createdAt: string;
  lastModified: string;
  status: string;
}

export async function getSessions() {
  try {
    console.log('API call: fetching all sessions');
    const response = await fetch(`${API_BASE_URL}/sessions`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return { 
        error: `Failed to fetch sessions: ${response.status} ${response.statusText}`,
        statusCode: response.status
      };
    }
    
    const data = await response.json();
    console.log('API response for sessions list:', data);
    return data;
  } catch (err) {
    console.error('API call error:', err);
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function getSession(sessionId: string) {
  try {
    console.log(`API call: fetching session with ID ${sessionId}`);
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return { 
        error: `Failed to fetch session: ${response.status} ${response.statusText}`,
        statusCode: response.status
      };
    }
    
    const data = await response.json();
    console.log('API response for session:', data);
    return data;
  } catch (err) {
    console.error('API call error:', err);
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function createSession(name: string, imageId: string, config = {}, credentialsSecret?: string) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, imageId, config, credentialsSecret }),
  });
  
  return response.json();
}

export async function endSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  
  return response.json();
}

export async function getSessionWebsocketInfo(sessionId: string) {
  try {
    console.log(`API call: fetching websocket info for session ${sessionId}`);
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/websocket`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return { 
        error: `Failed to fetch websocket info: ${response.status} ${response.statusText}`,
        statusCode: response.status
      };
    }
    
    const data = await response.json();
    console.log('API response for session websocket info:', data);
    return data;
  } catch (err) {
    console.error('API call error:', err);
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function uploadSessionFiles(sessionId: string, files: File[]) {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/files`, {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
}

export async function getImages() {
  const response = await fetch(`${API_BASE_URL}/images`);
  return response.json();
}

export async function getCredentialSecrets() {
  const response = await fetch(`${API_BASE_URL}/credentials/secrets`);
  return response.json();
}

// Socket connection helper
export function getSocketUrl() {
  return SOCKET_URL;
}
