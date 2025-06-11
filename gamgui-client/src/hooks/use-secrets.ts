import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getSecretsStatus, uploadSecret } from "@/api/secrets";

export function useSecretsStatus() {
  return useQuery({
    queryKey: ["secrets", "status"],
    queryFn: async () => {
      const response = await getSecretsStatus();
      return response.data;
    },
  });
}

export function useUploadSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ secretType, file }: { secretType: string; file: File }) =>
      uploadSecret(secretType, file),
    onSuccess: (_, { secretType }) => {
      queryClient.invalidateQueries({ queryKey: ["secrets", "status"] });
      toast.success(`${secretType} uploaded successfully`);
    },
    onError: (_, { secretType }) => {
      toast.error(`Failed to upload ${secretType}`);
    },
  });
}
