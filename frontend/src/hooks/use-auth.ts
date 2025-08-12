import { use } from "react";

import { AuthContext } from "@/contexts/auth-context";

export function useAuth() {
  const context = use(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
