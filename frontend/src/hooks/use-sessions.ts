import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createSession, endSession, getSession, getSessionAuditLogs, getSessions, uploadFileToSession } from "@/api/sessions";

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

export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endSession,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
      }
      else {
        throw new Error("Failed to end session");
      }
    },
  });
}

export function useUploadFileToSession() {
  return useMutation({
    mutationFn: ({ sessionId, file }: { sessionId: string; file: File }) =>
      uploadFileToSession(sessionId, file),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("File uploaded successfully");
      }
      else {
        toast.error("Failed to upload file");
      }
    },
    onError: () => {
      toast.error("Failed to upload file");
    },
  });
}

export function useSessionAuditLogs(sessionId: string, limit?: number) {
  return useQuery({
    queryKey: ["session-audit-logs", sessionId, limit],
    queryFn: async () => {
      const response = await getSessionAuditLogs(sessionId, limit);
      if (!response.success) {
        throw new Error("Failed to fetch audit logs");
      }
      return response.data;
    },
    enabled: !!sessionId,
  });
}
