import { io } from "socket.io-client";

import { getSocketUrl } from "./api";

// Define custom events for our terminal socket (commented out as it's not currently used)
// interface TerminalEvents {
//   // Client -> Server events
//   'join-session': (data: { sessionId: string }) => void;
//   'leave-session': (data: { sessionId: string }) => void;
//   'terminal-input': (data: string) => void;
//
//   // Server -> Client events
//   'terminal-output': (data: string) => void;
//   'terminal-closed': (data: { message: string }) => void;
//   'session-joined': (data: { message: string }) => void;
//   'session-left': (data: { message: string }) => void;
//   'error': (data: { message: string, error?: string }) => void;
// }

/**
 * Create a terminal connection to a session
 * @param sessionId The session ID to connect to
 * @returns The socket.io connection
 */
export function createTerminalConnection(sessionId: string) {
  const socket = io(`${getSocketUrl()}/terminal`);

  // Set up default event handlers
  socket.on("connect", () => {
    console.log("Connected to terminal socket");
    socket.emit("join-session", { sessionId });
  });

  socket.on("connect_error", (error: Error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("disconnect", (reason: string) => {
    console.log("Disconnected from terminal socket:", reason);
  });

  return socket;
}

/**
 * Create a websocket connection to a session
 * @param sessionId The session ID to connect to
 * @returns The socket.io connection
 */
export async function createSessionWebsocket(sessionId: string) {
  try {
    // Get the websocket info for the session
    console.log(`Fetching WebSocket info for session ${sessionId}...`);
    const response = await fetch(`${getSocketUrl()}/api/sessions/${sessionId}/websocket`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WebSocket info API error (${response.status}): ${errorText}`);
      throw new Error(`Failed to fetch WebSocket info: ${response.status} ${response.statusText}`);
    }

    const websocketInfo = await response.json();
    console.log("WebSocket info received:", websocketInfo);

    if (websocketInfo.error) {
      console.error("WebSocket info contains error:", websocketInfo.error);
      throw new Error(websocketInfo.error);
    }

    // Validate WebSocket info
    if (!websocketInfo.kubernetes) {
      console.warn("Session is not a Kubernetes session, falling back to regular terminal connection");
      throw new Error("Session is not a Kubernetes session");
    }

    if (!websocketInfo.websocketPath) {
      console.error("WebSocket info missing websocketPath");
      throw new Error("WebSocket URL not provided by server");
    }

    // Use the full WebSocket URL provided by the server API response
    const wsUrl = websocketInfo.websocketUrl;

    console.log(`Connecting to WebSocket at ${wsUrl}`);
    console.log(`WebSocket path from server: ${websocketInfo.websocketPath}`);

    // Create socket.io options with retry configuration
    const socketOptions = {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    };

    // Create a websocket connection to the session
    const socket = io(wsUrl, socketOptions);

    // Set up enhanced event handlers with more detailed logging
    socket.on("connect", () => {
      console.log(`✅ Connected to session websocket for session ${sessionId}`);
      console.log(`Socket ID: ${socket.id}`);
    });

    socket.on("connect_error", (error: Error) => {
      console.error(`❌ Session websocket connection error for session ${sessionId}:`, error);
      console.error("Connection details:", {
        url: wsUrl,
        sessionId,
        socketId: socket.id,
        transportType: socket.io.engine?.transport?.name,
      });
    });

    socket.on("error", (error: Error) => {
      console.error(`❌ Session websocket error for session ${sessionId}:`, error);
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`⚠️ Disconnected from session websocket for session ${sessionId}: ${reason}`);
    });

    socket.on("reconnect_attempt", (attemptNumber: number) => {
      console.log(`🔄 Attempting to reconnect to session ${sessionId} (attempt ${attemptNumber})`);
    });

    socket.on("reconnect", (attemptNumber: number) => {
      console.log(`✅ Reconnected to session ${sessionId} after ${attemptNumber} attempts`);
    });

    socket.on("reconnect_error", (error: Error) => {
      console.error(`❌ Failed to reconnect to session ${sessionId}:`, error);
    });

    socket.on("reconnect_failed", () => {
      console.error(`❌ Failed to reconnect to session ${sessionId} after all attempts`);
    });

    return socket;
  }
  catch (error) {
    console.error(`❌ Error creating session websocket for session ${sessionId}:`, error);
    throw error;
  }
}
