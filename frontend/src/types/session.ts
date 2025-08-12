export type SessionStatus = "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown";

export type Session = {
  id: string;
  name: string;
  description?: string;
  status: SessionStatus;
  user_id: string;
  pod_name: string;
  pod_namespace: string;
  created_at: string;
  updated_at: string;
};

export type SessionListItem = {
  id: string;
  name?: string;
  status: SessionStatus;
  created_at: string;
  expires_at?: string;
};

export type CreateSessionRequest = {
  name: string;
  description: string;
};

export type AuditLog = {
  timestamp: string;
  type: "command" | "output";
  data: string;
};
