import { api } from "@/lib/api";

export type FrontendEnv = {
  PROJECT_ID: string;
  PROJECT_NUMBER: string;
  ENVIRONMENT: string;
  REGION: string;
  FRONTEND_SERVICE_ACCOUNT_EMAIL: string;
  BACKEND_URL: string;
  FRONTEND_OAUTH_CLIENT_ID: string;
};

export async function getFrontendEnv(): Promise<FrontendEnv> {
  const { data } = await api.get("/env/frontend-env");

  return data;
}
