import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export type SecretStatusData = {
  complete: boolean;
  missingFiles: string[];
};

export async function uploadSecret(secretType: string, file: File): Promise<ApiResponse<null>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/secrets/upload/${secretType}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getSecretsStatus(): Promise<ApiResponse<SecretStatusData>> {
  const response = await api.get("/secrets/status");
  return response.data;
}
