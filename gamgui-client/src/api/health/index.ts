import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export type HealthData = {
  status: string;
  timestamp: string;
};

export type EnvironmentInfoData = {
  version: string;
  environment: string;
  pythonVersion: string;
  dependencies: Record<string, string>;
};

export async function healthCheck(): Promise<ApiResponse<HealthData>> {
  const response = await api.get("/health");
  return response.data;
}

export async function getEnvironmentInfo(): Promise<ApiResponse<EnvironmentInfoData>> {
  const response = await api.get("/health/info");
  return response.data;
}
