import { z } from "zod";

/* global process */

// Define schema for environment variables
const envSchema = z.object({
  PORT: z.string().default(() => {
    // Use port 3001 in development, 8080 in production
    return process.env.NODE_ENV === "development" || !process.env.NODE_ENV ? "3001" : "8080";
  }).transform(n => Number.parseInt(n, 10)),
  PROJECT_ID: z.string().min(1, "Required"),
  ENVIRONMENT: z.string().min(1, "Required"),
  BACKEND_URL: z.string().min(1, "Required"),
  FRONTEND_OAUTH_CLIENT_ID: z.string().min(1, "Required"),
});

// Parse and validate environment variables
const parsedEnv = envSchema.parse({
  PORT: process.env.PORT,
  PROJECT_ID: process.env.PROJECT_ID,
  ENVIRONMENT: process.env.ENVIRONMENT,
  BACKEND_URL: process.env.BACKEND_URL,
  FRONTEND_OAUTH_CLIENT_ID: process.env.FRONTEND_OAUTH_CLIENT_ID,
});

// Export validated environment variables
export const env = {
  ...parsedEnv,
};

// Export types for better TypeScript support
export type EnvConfig = typeof env;
