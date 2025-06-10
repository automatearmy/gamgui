import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export type SecretStatusData = {
  client_secrets_exists: boolean;
  oauth2_exists: boolean;
  oauth2service_exists: boolean;
  all_secrets_exist: boolean;
};

export async function uploadSecret(secretType: string, file: File): Promise<ApiResponse<null>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/secrets/upload/${secretType}`, formData);

  return response.data;
}

export async function getSecretsStatus(): Promise<ApiResponse<SecretStatusData>> {
  const response = await api.get("/secrets/status");
  return response.data;
}
