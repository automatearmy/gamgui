import type { CreateSessionRequest, Session } from "@/types/session";

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

export async function deleteSession(id: string): Promise<ApiResponse<void>> {
  const response = await api.delete(`/sessions/${id}`, { withCredentials: true });
  return response.data;
}

export async function getSessionHistory(id: string): Promise<ApiResponse<any[]>> {
  const response = await api.get(`/sessions/${id}/history`, { withCredentials: true });
  return response.data;
}
