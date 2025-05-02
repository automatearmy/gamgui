import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../lib/authContext';

const LoginButton: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="login-button-container">
      <GoogleLogin
        onSuccess={credentialResponse => {
          login(credentialResponse).catch(error => {
            console.error('Login failed:', error);
            // Show error message to user
            alert(`Login failed: ${error.message}`);
          });
        }}
        onError={() => {
          console.error('Login failed');
          // Show error message to user
          alert('Login failed. Please try again.');
        }}
        useOneTap
      />
    </div>
  );
};

export default LoginButton;
