const API_BASE_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

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
  const response = await fetch(`${API_BASE_URL}/sessions`);
  return response.json();
}

export async function getSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
  return response.json();
}

export async function createSession(name: string, imageId: string, config = {}) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, imageId, config }),
  });
  
  return response.json();
}

export async function endSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  
  return response.json();
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

// Socket connection helper
export function getSocketUrl() {
  return SOCKET_URL;
}
