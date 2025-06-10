/**
 * User model type definitions based on backend model
 */

/**
 * User model
 */
export type User = {
  id: string; // Typically added by the database
  email: string;
  display_name: string;
  picture?: string; // Optional
  role_id: string;
  organization_id: string;
  theme: string;
  timezone: string;
  status: string;
  last_login_at?: string; // Datetime as string in the frontend
};
