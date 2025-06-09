import axios, { isAxiosError } from "axios";

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 300000, // 5 minutes
  headers: {
    "Content-Type": "application/json",
  },
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
