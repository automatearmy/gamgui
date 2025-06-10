export type PodInfo = {
  id: string;
  name: string;
  namespace: string;
  port: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  name: string;
  description: string;
  status: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  expires_at: string;
  websocket_url: string;
  pod_info: PodInfo;
};

export type CreateSessionRequest = {
  name: string;
  description: string;
  timeout_minutes: number;
  domain: string;
};
