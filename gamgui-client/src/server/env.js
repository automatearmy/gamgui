import { z } from "zod";

/* global process */

// Define schema for environment variables
const envSchema = z.object({
  PORT: z
    .string()
    .transform(val => Number.parseInt(val, 10))
    .default("8080"),
  PROJECT_ID: z.string().min(1, "Required"),
  PROJECT_NUMBER: z.string().min(1, "Required"),
  ENVIRONMENT: z.string().min(1, "Required"),
  REGION: z.string().min(1, "Required"),
  CLIENT_SERVICE_ACCOUNT_EMAIL: z.string().min(1, "Required"),
  SERVER_URL: z.string().min(1, "Required"),
  CLIENT_OAUTH_CLIENT_ID: z.string().min(1, "Required"),
  VITE: z.string().transform(val => val === "true").default("false"),
});

// Parse and validate environment variables
const parsedEnv = envSchema.parse({
  PORT: process.env.PORT,
  PROJECT_ID: process.env.PROJECT_ID,
  PROJECT_NUMBER: process.env.PROJECT_NUMBER,
  ENVIRONMENT: process.env.ENVIRONMENT,
  REGION: process.env.REGION,
  CLIENT_SERVICE_ACCOUNT_EMAIL: process.env.CLIENT_SERVICE_ACCOUNT_EMAIL,
  SERVER_URL: process.env.SERVER_URL,
  CLIENT_OAUTH_CLIENT_ID: process.env.CLIENT_OAUTH_CLIENT_ID,
  VITE: process.env.VITE,
});

const derivedEnvs = {};

// Export validated environment variables with derived values
export const env = {
  ...parsedEnv,
  ...derivedEnvs,
};
