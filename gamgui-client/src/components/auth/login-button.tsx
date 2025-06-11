import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";

export function LoginButton() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="login-button-container">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          signInWithGoogle(credentialResponse.credential || "").catch((error) => {
            console.error("Login failed:", error);
            toast.error("Authentication failed", {
              description: "There was a problem signing you in.",
            });
          });
        }}
        onError={() => {
          console.error("Login failed");
          toast.error("Authentication failed", {
            description: "There was a problem with Google authentication.",
          });
        }}
        useOneTap
        auto_select
      />
    </div>
  );
};
