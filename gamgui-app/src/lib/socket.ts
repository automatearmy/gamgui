import { io } from "socket.io-client";
import { getSocketUrl } from "./api";

// Define custom events for our terminal socket
interface TerminalEvents {
  // Client -> Server events
  'join-session': (data: { sessionId: string }) => void;
  'leave-session': (data: { sessionId: string }) => void;
  'terminal-input': (data: string) => void;
  
  // Server -> Client events
  'terminal-output': (data: string) => void;
  'terminal-closed': (data: { message: string }) => void;
  'session-joined': (data: { message: string }) => void;
  'session-left': (data: { message: string }) => void;
  'error': (data: { message: string, error?: string }) => void;
}

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
