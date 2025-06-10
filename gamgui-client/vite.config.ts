import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";

import express from "./express-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), express("src/server/server.js")],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5001,
  },
});
