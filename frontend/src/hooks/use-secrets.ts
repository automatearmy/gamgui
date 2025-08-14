import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getAdminSecretsStatus, getSecretsStatus, uploadAdminSecret, uploadSecret } from "@/api/secrets";

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

export function useAdminSecretsStatus() {
  return useQuery({
    queryKey: ["secrets", "admin", "status"],
    queryFn: async () => {
      const response = await getAdminSecretsStatus();
      return response.data;
    },
  });
}

export function useUploadAdminSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ secretType, file }: { secretType: string; file: File }) =>
      uploadAdminSecret(secretType, file),
    onSuccess: (_, { secretType }) => {
      queryClient.invalidateQueries({ queryKey: ["secrets", "admin", "status"] });
      toast.success(`Admin ${secretType} uploaded successfully`);
    },
    onError: (_, { secretType }) => {
      toast.error(`Failed to upload admin ${secretType}`);
    },
  });
}
