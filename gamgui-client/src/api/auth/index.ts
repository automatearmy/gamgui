import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export type SignInData = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
    domain: string;
  };
};

export type SessionData = {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    picture: string;
    domain: string;
  };
};

export async function signIn(token: string): Promise<ApiResponse<SignInData>> {
  const response = await api.post(
    "/auth/sign-in",
    {
      token,
    },
    { withCredentials: true },
  );

  return response.data;
}

export async function getSession(): Promise<ApiResponse<SessionData>> {
  const response = await api.get("/auth/session", { withCredentials: true });
  return response.data;
}
