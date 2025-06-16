import { GoogleOAuthProvider } from "@react-oauth/google";
import Cookies from "js-cookie";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import type { User } from "@/types/user";

import { getSession, signIn } from "@/api/auth";
import { useEnv } from "@/hooks/use-env";
import { api } from "@/lib/api";
import { AUTHENTICATION_TOKEN_KEY } from "@/lib/constants/cookies";

type AuthContextType = {
  user: User;
  isAuthenticated: boolean;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const DEFAULT_PROPS: AuthContextType = {
  user: {} as User,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  loading: true,
};

export const AuthContext = createContext<AuthContextType>(DEFAULT_PROPS);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User>({} as User);
  const [loading, setLoading] = useState<boolean>(true);
  const { data: env } = useEnv();

  const signOut = useCallback(async () => {
    try {
      Cookies.remove(AUTHENTICATION_TOKEN_KEY);
      delete api.defaults.headers.common["X-Access-Token"];

      setIsAuthenticated(false);
      setUser({} as User);
      setLoading(false);
    }
    catch (error) {
      console.error("Error during sign out:", error);
      window.location.reload();
    }
  }, []);

  const checkSession = useCallback(async () => {
    setLoading(true);

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

    setLoading(false);
  }, [signOut]);

  const signInWithGoogle = useCallback(async (credential: string) => {
    try {
      const response = await signIn(credential);

      if (!response.success || !response.data.token) {
        throw new Error("Google Invalid token");
      }

      Cookies.set(AUTHENTICATION_TOKEN_KEY, response.data.token, {
        expires: 1,
      });

      api.defaults.headers.common["X-Access-Token"] = response.data.token;

      setIsAuthenticated(true);
      setUser(response.data.user as User);

      // Don't set loading to false here - let the redirect handle the state
      window.location.href = "/";
    }
    catch (error) {
      console.error("Error during Google sign-in:", error);
      await signOut();
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    const token = Cookies.get(AUTHENTICATION_TOKEN_KEY);

    if (token) {
      api.defaults.headers.common["X-Access-Token"] = token;
      checkSession();
    }
    else {
      setLoading(false);
    }
  }, [checkSession]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      signInWithGoogle,
      signOut,
    }),
    [user, loading, isAuthenticated, signInWithGoogle, signOut],
  );

  const googleClientId = env?.CLIENT_OAUTH_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext value={contextValue}>{children}</AuthContext>
    </GoogleOAuthProvider>
  );
};
