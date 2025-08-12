import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getFrontendEnv } from "@/api/env";
import { LoginForm } from "@/components/auth/login-form";
import { AutomateArmyLogo } from "@/components/ui/automate-army-logo";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Logo } from "@/components/ui/logo";

export function LoginPage() {
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGoogleClientId = async () => {
      try {
        const env = await getFrontendEnv();
        setGoogleClientId(env.FRONTEND_OAUTH_CLIENT_ID);
      }
      catch (error) {
        console.error("Failed to load Google Client ID:", error);
      }
      finally {
        setIsLoading(false);
      }
    };

    loadGoogleClientId();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Failed to load authentication configuration</p>
          <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center md:justify-start">
            <Link to="/" className="flex items-center">
              <Logo size="lg" clickable />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <LoginForm />
            </div>
          </div>
          <div className="flex justify-center items-center gap-3 pb-6">
            <span className="text-xs text-muted-foreground">Built by</span>
            <div className="flex items-center gap-1">
              <AutomateArmyLogo size="md" />
              <span className="text-xs text-muted-foreground">Automate Army</span>
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <img
            src="/placeholder.svg"
            alt="Image"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
