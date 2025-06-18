import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";

import { CardDescription, CardHeader, CardTitle } from "../ui/card";
import { LoadingSpinner } from "../ui/loading-spinner";

export function LoginForm() {
  const { signIn, isSigningIn } = useAuth();

  const handleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        await signIn(credentialResponse.credential);
      }
      catch {
        toast.error("Sign-in failed. Please try again.");
      }
    }
    else {
      toast.error("Authentication failed: No credential received");
    }
  };

  const handleError = () => {
    toast.error("Google Sign-In failed. Please try again.");
  };

  return (
    <form className="flex flex-col gap-6">
      <div>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your Google account
          </CardDescription>
        </CardHeader>
      </div>
      <div className="grid gap-6">
        <div className="flex justify-center">
          {isSigningIn
            ? (
                <div>
                  <LoadingSpinner />
                </div>
              )
            : (
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={handleError}
                  shape="pill"
                  theme="outline"
                />
              )}
        </div>
      </div>
    </form>
  );
}
