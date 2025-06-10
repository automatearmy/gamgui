import express from "express";

import { env } from "../env";

/**
 * Creates routes for exposing environment variables to the frontend
 * @returns {express.Router} The router with environment variable routes
 */
export function createEnvRoutes() {
  const router = express.Router();

  // Route to get frontend environment variables
  router.get("/frontend-env", (req, res) => {
    // Only expose specific environment variables that the frontend needs
    const frontendEnv = {
      PROJECT_ID: env.PROJECT_ID,
      PROJECT_NUMBER: env.PROJECT_NUMBER,
      ENVIRONMENT: env.ENVIRONMENT,
      REGION: env.REGION,
      CLIENT_SERVICE_ACCOUNT_EMAIL: env.CLIENT_SERVICE_ACCOUNT_EMAIL,
      SERVER_URL: env.SERVER_URL,
      CLIENT_OAUTH_CLIENT_ID: env.CLIENT_OAUTH_CLIENT_ID,
    };

    res.json(frontendEnv);
  });

  return router;
}
