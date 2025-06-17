import { createContext } from "react";

import type { User } from "@/types/user";

type AuthContextType = {
  user: User;
  isAuthenticated: boolean;
  isSigningIn: boolean;
  isLoading: boolean;
  signIn: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const DEFAULT_PROPS: AuthContextType = {
  user: {} as User,
  isAuthenticated: false,
  isSigningIn: false,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
};

export const AuthContext = createContext<AuthContextType>(DEFAULT_PROPS);
export type { AuthContextType };
