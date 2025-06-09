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
      VITE_CLIENT_ID: env.VITE_CLIENT_ID,
    };

    res.json(frontendEnv);
  });

  return router;
}
