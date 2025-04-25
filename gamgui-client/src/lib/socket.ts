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
  socket.on('connect', () => {
    console.log('Connected to terminal socket');
    socket.emit('join-session', { sessionId });
  });
  
  socket.on('connect_error', (error: Error) => {
    console.error('Socket connection error:', error);
  });
  
  socket.on('disconnect', (reason: string) => {
    console.log('Disconnected from terminal socket:', reason);
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
    const response = await fetch(`${getSocketUrl()}/api/sessions/${sessionId}/websocket`);
    const websocketInfo = await response.json();
    
    console.log('WebSocket info:', websocketInfo);
    
    if (websocketInfo.error) {
      throw new Error(websocketInfo.error);
    }
    
    // Create a websocket connection to the session
    const socket = io(`${getSocketUrl()}/ws/session/${sessionId}/`);
    
    // Set up default event handlers
    socket.on('connect', () => {
      console.log(`Connected to session websocket for session ${sessionId}`);
    });
    
    socket.on('connect_error', (error: Error) => {
      console.error('Session websocket connection error:', error);
    });
    
    socket.on('disconnect', (reason: string) => {
      console.log(`Disconnected from session websocket: ${reason}`);
    });
    
    return socket;
  } catch (error) {
    console.error('Error creating session websocket:', error);
    throw error;
  }
}
