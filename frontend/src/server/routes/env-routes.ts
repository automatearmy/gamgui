import type { Response } from "express";

import express from "express";

import { env } from "../env.js";

export function createEnvRoutes(): express.Router {
  const router = express.Router();

  // Route to get frontend environment variables
  router.get("/frontend-env", (_, res: Response) => {
    const frontendEnv = {
      PROJECT_ID: env.PROJECT_ID,
      ENVIRONMENT: env.ENVIRONMENT,
      BACKEND_URL: env.BACKEND_URL,
      FRONTEND_OAUTH_CLIENT_ID: env.FRONTEND_OAUTH_CLIENT_ID,
    };

    res.json(frontendEnv);
  });

  return router;
}
