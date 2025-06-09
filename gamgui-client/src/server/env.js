import { z } from "zod";

/* global process */

// Define schema for environment variables
const envSchema = z.object({
  PORT: z
    .string()
    .transform(val => Number.parseInt(val, 10))
    .default("8080"),
  VITE_CLIENT_ID: z.string().min(1, "Client ID is required"),
  API_URL: z.string().url("API URL must be a valid URL"),
  CLIENT_SECRET: z.string().min(1, "Client secret is required"),
  PROJECT_ID: z.string().min(1, "Project ID is required"),
  VITE: z.string().transform(val => val === "true").default("false"),
});

// Parse and validate environment variables
const parsedEnv = envSchema.parse({
  PORT: process.env.PORT,
  VITE_CLIENT_ID: process.env.VITE_CLIENT_ID,
  API_URL: process.env.API_URL,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  PROJECT_ID: process.env.PROJECT_ID,
  VITE: process.env.VITE,
});

const derivedEnvs = {};

// Export validated environment variables with derived values
export const env = {
  ...parsedEnv,
  ...derivedEnvs,
};
