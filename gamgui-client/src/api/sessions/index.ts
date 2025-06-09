import type { ApiResponse } from "../types";

import { api } from "../../lib/api";

export type SessionListItem = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  userId?: string;
};

export type Session = {
  id: string;
  name: string;
  containerId: string;
  containerName: string;
  imageId: string;
  imageName: string;
  createdAt: string;
  lastModified: string;
  status: string;
  userId?: string;
};

export type CreateSessionOptions = {
  name: string;
  imageId: string;
  config?: Record<string, any>;
  credentialsSecret?: string;
  userId?: string;
};

export async function listSessions(userId?: string): Promise<ApiResponse<SessionListItem[]>> {
  const params = userId ? { userId } : undefined;
  const response = await api.get("/sessions", { params });
  return response.data;
}

export async function getSession(sessionId: string, userId?: string): Promise<ApiResponse<Session>> {
  const params = userId ? { userId } : undefined;
  const response = await api.get(`/sessions/${sessionId}`, { params });
  return response.data;
}

export async function createSession(options: CreateSessionOptions): Promise<ApiResponse<Session>> {
  const response = await api.post("/sessions", options);
  return response.data;
}

export async function deleteSession(sessionId: string, userId?: string): Promise<ApiResponse<Record<string, any>>> {
  const params = userId ? { userId } : undefined;
  const response = await api.delete(`/sessions/${sessionId}`, { params });
  return response.data;
}
