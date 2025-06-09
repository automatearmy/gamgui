import axios from "axios"; // HTTP client

// Core dependencies
import { env } from "../env"; // Environment configuration
import { getIdToken } from "../utils/google-auth"; // Google Cloud authentication

/**
 * Creates a middleware function that proxies requests to the Python API
 * @param {object} options - Configuration options
 * @param {string} options.prefix - URL prefix to strip from the request path
 * @param {boolean} options.includeUser - Whether to include the user in the request body
 * @returns {Function} Express middleware function
 */
export function createProxyMiddleware(options = { prefix: "/api", includeUser: true }) {
  return async (req, res, next) => {
    try {
      // Skip if this is not an API request or if it's handled by another middleware
      if (!req.path.startsWith(options.prefix)) {
        return next();
      }

      // Get the target path by removing the prefix
      const targetPath = req.path.replace(options.prefix, "");

      // Build the target URL - ensure no double slashes
      let url = `${env.API_URL.replace(/\/$/, "")}/${targetPath.replace(/^\//, "")}`;

      // Add query parameters if they exist
      const queryString = new URLSearchParams(req.query).toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      // We'll only use two headers: x-user-email and x-access-token
      // Generate auth token for Cloud Run API
      const idToken = await getIdToken();

      // Create minimal headers - only what's required
      const headers = {
        "x-user-email": req.headers["x-user-email"] || "",
        "x-access-token": req.headers["x-access-token"] || "",
        "authorization": `Bearer ${idToken}`,
      };

      // Prepare request config for axios
      const requestConfig = {
        method: req.method,
        url,
        headers,
        validateStatus: () => true, // Allow all status codes
      };

      // Add body for POST, PUT, PATCH requests
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        const body = { ...req.body };

        // Include user information if needed
        if (options.includeUser && req.user) {
          body.uid = req.user.email;
        }

        requestConfig.data = body;
      }

      // Make the request to the Python API using axios
      const response = await axios(requestConfig);

      // Set response status
      res.status(response.status);

      // Send the response data directly
      return res.send(response.data);
    }
    catch (error) {
      console.error("Proxy middleware error:", error);

      // If we get here, something went wrong with the proxy
      return res.status(500).json({
        success: false,
        message: error?.message || "Internal Server Error",
        data: null,
      });
    }
  };
}
