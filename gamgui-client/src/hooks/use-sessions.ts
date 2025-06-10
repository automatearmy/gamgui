import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createSession, deleteSession, getSession, getSessions } from "@/api/sessions";

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const response = await getSessions();
      if (!response.success) {
        throw new Error("Failed to fetch sessions");
      }
      return response.data;
    },
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const response = await getSession(id);
      if (!response.success) {
        throw new Error("Failed to fetch session");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSession,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        toast.success("Session created successfully");
      }
      else {
        toast.error("Failed to create session");
      }
    },
    onError: () => {
      toast.error("Failed to create session");
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        toast.success("Session deleted successfully");
      }
      else {
        toast.error("Failed to delete session");
      }
    },
    onError: () => {
      toast.error("Failed to delete session");
    },
  });
}
