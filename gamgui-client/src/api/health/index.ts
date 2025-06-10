import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export type HealthData = {
  status: string;
  timestamp: string;
  environment: string;
  project_id: string;
  version: string;
};

export type EnvironmentInfoData = {
  environment: string;
  project_id: string;
  system_info: {
    python_version: string;
    platform: string;
    processor: string;
    hostname: string;
  };
  api_info: {
    port: number;
    environment: string;
    region: string;
  };
};

export async function healthCheck(): Promise<ApiResponse<HealthData>> {
  const response = await api.get("/health/");
  return response.data;
}

export async function getEnvironmentInfo(): Promise<ApiResponse<EnvironmentInfoData>> {
  const response = await api.get("/health/info");
  return response.data;
}
