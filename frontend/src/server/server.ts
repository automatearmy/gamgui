/* eslint-disable no-console */

import "dotenv/config";

import type { Response } from "express";
import type { Options } from "http-proxy-middleware";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server as SocketIOServer } from "socket.io";
import { io as SocketIOClient } from "socket.io-client";

import { env } from "./env.js";
import { createEnvRoutes } from "./routes/env-routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// App Configurations
app.set("etag", false);
app.set("trust proxy", true);

// CORS configuration for development
const corsOptions = {
  origin: process.env.NODE_ENV === "development"
    ? ["http://localhost:5173", "http://localhost:3001"]
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Access-Token"],
};

app.use(cors(corsOptions));

// Routes
app.use("/api/env", createEnvRoutes());

const proxyOptions: Options = {
  target: env.BACKEND_URL,
  changeOrigin: true,
  pathRewrite: { "^/api": "" },
};

const apiProxy = createProxyMiddleware(proxyOptions);

app.use("/api", apiProxy);

// Static file serving with proper cache control headers
const staticRoot = path.join(__dirname);

app.use(
  express.static(staticRoot, {
    setHeaders: (res: Response, filePath: string) => {
      // For JS and CSS files (which have content hashes in their filenames in production build)
      // we can use a long cache time as they are automatically cache-busted by the hash
      if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
        // Cache for 1 year (these files have hashed filenames so they're safe to cache long-term)
        res.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      // For images and other static assets
      else if (filePath.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
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

// SPA fallback - serve index.html for all other routes
app.use("/*", (_, res) => {
  // Always serve index.html with no-cache to ensure users get the latest version
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(staticRoot, "index.html"));
});

// Create HTTP server and attach Socket.IO
const server = createServer(app);

// Initialize Socket.IO server
const io = new SocketIOServer(server, {
  path: "/socket/socket.io/",
  cors: {
    origin: process.env.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://localhost:3001"]
      : true,
    credentials: true,
  },
});

// Socket.IO relay to Python backend
io.on("connection", (frontendSocket) => {
  console.log("Frontend Socket.IO connected:", frontendSocket.id);

  // Extract authentication token from handshake
  const token = frontendSocket.handshake.auth?.token;

  if (!token) {
    console.error("No auth token provided");
    frontendSocket.emit("error", { message: "Authentication required" });
    frontendSocket.disconnect();
    return;
  }

  // Connect to Python backend Socket.IO server
  const backendSocket = SocketIOClient(env.BACKEND_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  // Handle backend connection
  backendSocket.on("connect", () => {
    console.log("Connected to Python backend Socket.IO server");
  });

  backendSocket.on("connect_error", (error) => {
    console.error("Backend Socket.IO connection error:", error.message);
    frontendSocket.emit("error", { message: "Backend connection failed" });
  });

  // Relay all events from frontend to backend
  frontendSocket.onAny((event, ...args) => {
    console.log(`Relaying frontend -> backend: ${event}`);
    backendSocket.emit(event, ...args);
  });

  // Relay all events from backend to frontend
  backendSocket.onAny((event, ...args) => {
    console.log(`Relaying backend -> frontend: ${event}`);
    frontendSocket.emit(event, ...args);
  });

  // Handle disconnections
  frontendSocket.on("disconnect", (reason) => {
    console.log("Frontend Socket.IO disconnected:", reason);
    backendSocket.disconnect();
  });

  backendSocket.on("disconnect", (reason) => {
    console.log("Backend Socket.IO disconnected:", reason);
    frontendSocket.emit("error", { message: "Backend connection lost" });
    frontendSocket.disconnect();
  });
});

// Start server
server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`Serving static files from: ${staticRoot}`);
  console.log(`Proxying API requests to: ${env.BACKEND_URL}`);
  console.log(`Socket.IO relay to: ${env.BACKEND_URL}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
