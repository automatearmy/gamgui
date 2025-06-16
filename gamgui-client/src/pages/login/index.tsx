import { Link } from "react-router-dom";

import { LoginForm } from "@/components/auth/login-form";
import { AutomateArmyLogo } from "@/components/ui/automate-army-logo";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Logo } from "@/components/ui/logo";
import { useLoading } from "@/contexts/loading-context";

export function LoginPage() {
  const { loading } = useLoading();

  return (
    <>
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

      <LoadingOverlay
        isVisible={loading.login}
        message="Authenticating..."
      />
    </>
  );
}
