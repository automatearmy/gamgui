import { GoogleLogin } from "@react-oauth/google";
import React from "react";

import { useAuth } from "../../lib/auth-context";

const LoginButton: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="login-button-container">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          login(credentialResponse).catch((error) => {
            console.error("Login failed:", error);
          });
        }}
        onError={() => {
          console.error("Login failed");
        }}
        useOneTap
      />
    </div>
  );
};

export default LoginButton;
