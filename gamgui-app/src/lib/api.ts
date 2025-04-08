const API_BASE_URL = 'http://localhost:3001/api';

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
