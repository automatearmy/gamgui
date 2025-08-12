import { useQuery } from "@tanstack/react-query";

import { getEnvironmentInfo, healthCheck } from "@/api/health";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await healthCheck();
      return response.data;
    },
  });
}

export function useEnvironmentInfo() {
  return useQuery({
    queryKey: ["health", "info"],
    queryFn: async () => {
      const response = await getEnvironmentInfo();
      return response.data;
    },
  });
}
