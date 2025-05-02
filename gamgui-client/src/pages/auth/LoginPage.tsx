import React, { useEffect } from 'react';
import LoginButton from '../../components/auth/LoginButton';
import { useAuth } from '../../lib/authContext';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      onNavigate('/');
    }
  }, [isAuthenticated, isLoading, onNavigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to GAMGUI</h1>
          <p className="mt-2 text-gray-600">
            Please sign in with your Google account to continue.
          </p>
          <p className="mt-2 text-sm text-amber-600">
            Note: Only users with authorized email domains can access this application.
          </p>
        </div>
        
        <div className="mt-8 flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
