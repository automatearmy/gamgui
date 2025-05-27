import { getApiConfig, validateConfig, logConfig } from './config';

// Get dynamic configuration
const { apiUrl: API_BASE_URL, socketUrl: SOCKET_URL } = getApiConfig();

// Validate configuration on module load
validateConfig({ apiUrl: API_BASE_URL, socketUrl: SOCKET_URL });

// Log configuration for debugging
logConfig();

export interface AuthFiles {
  clientSecrets: File | null;
  oauth2: File | null;
  oauth2service: File | null;
}

// Helper function to get the auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('gamgui-token');
}

// Helper function to create headers with authorization
function createAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function uploadCredentials(files: AuthFiles, userId?: string) {
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

  // Use userId in the URL if provided, otherwise use the authenticated user's ID
  const url = userId
    ? `${API_BASE_URL}/credentials/${userId}`
    : `${API_BASE_URL}/credentials`;

  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  return response.json();
}

export async function createImage(name: string) {
  const response = await fetch(`${API_BASE_URL}/images`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ name }),
  });

  return response.json();
}

export async function checkCredentials(userId?: string) {
  // Use userId in the URL if provided
  const url = userId
    ? `${API_BASE_URL}/credentials/check/${userId}`
    : `${API_BASE_URL}/credentials/check`;

  console.log('API call: checking credentials at URL:', url);
  console.log('API_BASE_URL value:', API_BASE_URL);
  
  const response = await fetch(url, {
    headers: createAuthHeaders(),
  });
  
  return response.json();
}

export async function deleteCredentials(userId?: string) {
  // Use userId in the URL if provided
  const url = userId
    ? `${API_BASE_URL}/credentials/${userId}`
    : `${API_BASE_URL}/credentials`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: createAuthHeaders(),
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
  userId?: string; // Add userId field
}

export async function getSessions(userId?: string) {
  try {
    // Add userId as a query parameter if provided
    const queryParams = userId ? `?userId=${userId}` : '';
    const fullUrl = `${API_BASE_URL}/sessions${queryParams}`;

    console.log('API call: fetching sessions from URL:', fullUrl);
    console.log('API_BASE_URL value:', API_BASE_URL);
    
    const response = await fetch(fullUrl, {
      headers: createAuthHeaders(),
    });

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

export async function getSession(sessionId: string, userId?: string) {
  try {
    // Add userId as a query parameter if provided
    const queryParams = userId ? `?userId=${userId}` : '';
    const url = `${API_BASE_URL}/sessions/${sessionId}${queryParams}`;

    console.log(`API call: fetching session with ID ${sessionId}`);
    
    const response = await fetch(url, {
      headers: createAuthHeaders(),
    });

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

export async function createSession(name: string, imageId: string, config = {}, credentialsSecret?: string, userId?: string) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ name, imageId, config, credentialsSecret, userId }),
  });

  return response.json();
}

export async function endSession(sessionId: string, userId?: string) {
  // Add userId as a query parameter if provided
  const queryParams = userId ? `?userId=${userId}` : '';
  const url = `${API_BASE_URL}/sessions/${sessionId}${queryParams}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  return response.json();
}

export async function getSessionWebsocketInfo(sessionId: string, userId?: string) {
  try {
    // Add userId as a query parameter if provided
    const queryParams = userId ? `?userId=${userId}` : '';
    const url = `${API_BASE_URL}/sessions/${sessionId}/websocket${queryParams}`;

    console.log(`API call: fetching websocket info for session ${sessionId}`);
    
    const response = await fetch(url, {
      headers: createAuthHeaders(),
    });

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

export async function uploadSessionFiles(sessionId: string, files: File[], userId?: string) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  // Add userId as a query parameter if provided
  const queryParams = userId ? `?userId=${userId}` : '';
  const url = `${API_BASE_URL}/sessions/${sessionId}/files${queryParams}`;

  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  return response.json();
}

export async function getImages() {
  const response = await fetch(`${API_BASE_URL}/images`, {
    headers: createAuthHeaders(),
  });
  
  return response.json();
}

export async function getCredentialSecrets(userId?: string) {
  // Use userId in the URL if provided
  const url = userId
    ? `${API_BASE_URL}/credentials/secrets/${userId}`
    : `${API_BASE_URL}/credentials/secrets`;

  const response = await fetch(url, {
    headers: createAuthHeaders(),
  });
  
  return response.json();
}

// Authentication functions
export async function verifyToken(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  
  return response.json();
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) {
    return { error: 'No authentication token found' };
  }
  
  const response = await fetch(`${API_BASE_URL}/auth/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
}

// Socket connection helper
export function getSocketUrl() {
  return SOCKET_URL;
}

// Helper to get the API base URL
export function getApiBaseUrl() {
  return API_BASE_URL;
}
