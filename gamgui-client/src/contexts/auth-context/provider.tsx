import { GoogleOAuthProvider } from "@react-oauth/google";
import Cookies from "js-cookie";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { User } from "@/types/user";

import { signIn as apiSignIn, getSession } from "@/api/auth";
import { useEnv } from "@/hooks/use-env";
import { api } from "@/lib/api";
import { AUTHENTICATION_TOKEN_KEY } from "@/lib/constants/cookies";

import { AuthContext } from "./context";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User>({} as User);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const { data: env } = useEnv();

  const signOut = useCallback(async () => {
    try {
      Cookies.remove(AUTHENTICATION_TOKEN_KEY);
      delete api.defaults.headers.common["X-Access-Token"];

      setIsAuthenticated(false);
      setUser({} as User);
      setIsLoading(false);
    }
    catch (error) {
      console.error("Error during sign out:", error);
      window.location.reload();
    }
  }, []);

  const checkSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await getSession();

      if (response.success && response.data.authenticated && response.data.user) {
        setIsAuthenticated(true);
        setUser(response.data.user);
      }
      else {
        await signOut();
      }
    }
    catch (error) {
      console.error("Error checking session:", error);
      setIsAuthenticated(false);
      setUser({} as User);
    }

    setIsLoading(false);
  }, [signOut]);

  const signIn = useCallback(async (credential: string) => {
    setIsSigningIn(true);

    try {
      const response = await apiSignIn(credential);

      if (!response.success || !response.data.token) {
        throw new Error("Google Invalid token");
      }

      Cookies.set(AUTHENTICATION_TOKEN_KEY, response.data.token, {
        expires: 1,
      });

      api.defaults.headers.common["X-Access-Token"] = response.data.token;

      setIsAuthenticated(true);
      setUser(response.data.user as User);

      window.location.href = "/";

      setIsLoading(false);
      setIsSigningIn(false);
    }
    catch (error) {
      setUser({} as User);
      setIsLoading(false);
      setIsSigningIn(false);

      throw error
    }
  }, [signOut]);

  useEffect(() => {
    const token = Cookies.get(AUTHENTICATION_TOKEN_KEY);

    if (token) {
      api.defaults.headers.common["X-Access-Token"] = token;
      checkSession();
    }
    else {
      setIsLoading(false);
    }
  }, [checkSession]);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isSigningIn,
      isLoading,
      signIn,
      signOut,
    }),
    [user, isAuthenticated, isSigningIn, isLoading, signIn, signOut],
  );

  const googleClientId = env?.CLIENT_OAUTH_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext value={contextValue}>{children}</AuthContext>
    </GoogleOAuthProvider>
  );
};
