// Environment configuration
import "dotenv/config";
import bodyParser from "body-parser";
import dotenv from "dotenv";
// Core dependencies
import express from "express";
import nocache from "nocache";
import path from "node:path";

import { env } from "./env";
// Authentication
import { createEnvRoutes } from "./routes/env-routes";
// Middleware
import { createProxyMiddleware } from "./utils/proxy-middleware";

dotenv.config();

export const app = express();

// App Configurations
app.set("etag", false);
app.set("trust proxy", true); // TODO: Make this more restrictive
app.use(nocache());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Environment Routes - no authentication required
app.use("/api/env", createEnvRoutes());

// Use proxy middleware for all API routes
app.use(createProxyMiddleware({ prefix: "/api" }));

if (!env.VITE) {
  /* global __dirname */
  const root = path.join(__dirname);

  // Set appropriate cache control headers for static files
  app.use(
    express.static(root, {
      setHeaders: (res, path) => {
        // For JS and CSS files (which have content hashes in their filenames in production build)
        // we can use a long cache time as they are automatically cache-busted by the hash
        if (path.endsWith(".js") || path.endsWith(".css")) {
          // Cache for 1 year (these files have hashed filenames so they're safe to cache long-term)
          res.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        // For images and other static assets
        else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
          // Cache for 1 week
          res.set("Cache-Control", "public, max-age=604800");
        }
        // For HTML and JSON files, no caching
        else {
          res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.set("Pragma", "no-cache");
          res.set("Expires", "0");
        }
      },
    }),
  );

  // For all other routes, serve index.html with no caching
  app.use("/*", (req, res) => {
    // Always serve index.html with no-cache to ensure users get the latest version
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.listen(env.PORT);
}
