import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { toast } from "sonner";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/hooks/use-auth";

export function LoginButton() {
  const { signInWithGoogle } = useAuth();
  const { setLoading } = useLoading();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSuccess = async (credentialResponse: any) => {
    setIsSigningIn(true);
    setLoading("login", true);

    try {
      await signInWithGoogle(credentialResponse.credential || "");
    }
    catch (error) {
      console.error("Login failed:", error);
      toast.error("Authentication failed", {
        description: "There was a problem signing you in.",
      });
    }
    finally {
      setIsSigningIn(false);
      setLoading("login", false);
    }
  };

  const handleError = () => {
    console.error("Login failed");
    toast.error("Authentication failed", {
      description: "There was a problem with Google authentication.",
    });
  };

  if (isSigningIn) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <LoadingSpinner className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">Signing in...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="login-button-container">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        auto_select
      />
    </div>
  );
};
