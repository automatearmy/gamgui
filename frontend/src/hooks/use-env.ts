import { useQuery } from "@tanstack/react-query";

import { getFrontendEnv } from "@/api/env";

export function useEnv() {
  return useQuery({
    queryKey: ["env", "frontend"],
    queryFn: getFrontendEnv,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
