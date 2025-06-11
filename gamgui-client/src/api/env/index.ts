export type FrontendEnv = {
  PROJECT_ID: string;
  PROJECT_NUMBER: string;
  ENVIRONMENT: string;
  REGION: string;
  CLIENT_SERVICE_ACCOUNT_EMAIL: string;
  SERVER_URL: string;
  CLIENT_OAUTH_CLIENT_ID: string;
};

export async function getFrontendEnv(): Promise<FrontendEnv> {
  const response = await fetch("/api/env/frontend-env");

  if (!response.ok) {
    throw new Error("Failed to fetch environment variables");
  }

  return response.json();
}
