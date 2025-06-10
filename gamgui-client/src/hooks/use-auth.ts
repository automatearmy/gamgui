import { use } from "react";

import { AuthContext } from "@/contexts/auth-context";

/**
 * Custom hook to access the authentication context
 *
 * @returns Authentication context value
 */
export function useAuth() {
  const context = use(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
