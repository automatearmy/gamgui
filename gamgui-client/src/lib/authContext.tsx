import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getApiConfig } from './config';

// Define the user type
interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  domain: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (tokenResponse: any) => Promise<void>;
  logout: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const storedUser = localStorage.getItem('gamgui-user');
      const storedToken = localStorage.getItem('gamgui-token');
      
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('gamgui-user');
          localStorage.removeItem('gamgui-token');
        }
      }
      setIsLoading(false);
    };

    checkExistingSession();
  }, []);

  // Login function
  const login = async (tokenResponse: any) => {
    try {
      // Send the token to the backend for verification
      // Get dynamic API configuration
      const { apiUrl } = getApiConfig();
      const response = await fetch(`${apiUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenResponse.credential }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      const userData = await response.json();
      
      // Store user data and token in state and localStorage
      setUser(userData);
      setToken(tokenResponse.credential);
      localStorage.setItem('gamgui-user', JSON.stringify(userData));
      localStorage.setItem('gamgui-token', tokenResponse.credential);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gamgui-user');
    localStorage.removeItem('gamgui-token');
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Create a wrapper component that includes the Google OAuth provider
export const AuthProviderWithGoogle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return <div>Error: Google OAuth client ID is not configured</div>;
  }
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
};
