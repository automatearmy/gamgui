import type { AuditLog, CreateSessionRequest, Session } from "@/types/session";

import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export async function getSessions(): Promise<ApiResponse<Session[]>> {
  const response = await api.get("/sessions/", { withCredentials: true });
  return response.data;
}

export async function getSession(id: string): Promise<ApiResponse<Session>> {
  const response = await api.get(`/sessions/${id}`, { withCredentials: true });
  return response.data;
}

export async function createSession(data: CreateSessionRequest): Promise<ApiResponse<Session>> {
  const response = await api.post("/sessions/", data, { withCredentials: true });
  return response.data;
}

export async function endSession(id: string): Promise<ApiResponse<Session>> {
  const response = await api.post(`/sessions/${id}/end`, {}, { withCredentials: true });
  return response.data;
}

export async function uploadFileToSession(sessionId: string, file: File): Promise<ApiResponse<void>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/sessions/${sessionId}/upload`, formData, {
    withCredentials: true,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getSessionAuditLogs(sessionId: string, limit: number = 500): Promise<ApiResponse<AuditLog[]>> {
  const response = await api.get(`/sessions/${sessionId}/audit-logs?limit=${limit}`, {
    withCredentials: true,
  });
  return response.data;
}
