// Google Auth dependencies
import { GoogleAuth } from "google-auth-library";

// Environment configuration
import { env } from "../env";

// Create a new GoogleAuth instance
const auth = new GoogleAuth();

/**
 * Get an ID token for the Cloud Run API
 * @returns {Promise<string>} The ID token
 */
export async function getIdToken() {
  try {
    // Get the API URL and use full URL as audience
    const apiUrl = env.API_URL;

    // Get application default credentials with the full URL as audience
    const client = await auth.getIdTokenClient(apiUrl);

    // Get an ID token for the target audience
    const headers = await client.getRequestHeaders();

    // Extract the token from the Authorization header
    const token = headers.Authorization.split(" ")[1];

    return token;
  }
  catch (error) {
    console.error("Error getting ID token for Cloud Run:", error);
    throw error;
  }
}
