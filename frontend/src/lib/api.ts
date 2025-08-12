import axios, { isAxiosError } from "axios";

// Determine the API base URL based on environment
function getApiBaseUrl() {
  // In development point to proxy server
  if (import.meta.env.DEV) {
    return "http://localhost:3001/api";
  }

  // In production or when running from the proxy server, use relative path
  return "/api";
}

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Add response interceptor to handle common scenarios
api.interceptors.response.use(
  response => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error);
      return Promise.reject(error);
    }

    // Handle axios specific errors
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const code = error.response?.data?.code;

      // Handle unauthorized access
      if (status === 401 && code === "UNAUTHORIZED") {
        // Redirect to login page
        window.location.replace("/");
        return Promise.reject(error);
      }

      // Handle server errors
      if (status >= 500) {
        console.error("Server error:", error);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
