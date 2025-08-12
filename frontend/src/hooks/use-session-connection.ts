import type { Socket } from "socket.io-client";

import Cookies from "js-cookie";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { AUTHENTICATION_TOKEN_KEY } from "@/lib/constants/cookies";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function useSessionConnection(sessionId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  const connect = useCallback(() => {
    if (!sessionId) {
      console.error("No session ID provided");
      return;
    }

    if (socketRef.current?.connected) {
      console.warn("Already connected");
      return;
    }

    setConnectionStatus("connecting");

    // Get the authentication token from cookies
    const token = Cookies.get(AUTHENTICATION_TOKEN_KEY);

    if (!token) {
      console.error("No authentication token found");
      setConnectionStatus("disconnected");
      return;
    }

    // Determine the socket URL and options based on environment
    const getSocketConfig = () => {
      if (import.meta.env.DEV) {
        // In development, connect to proxy server with custom path
        return {
          url: "http://localhost:3001",
          options: {
            path: "/socket/socket.io/",
            auth: { token },
            transports: ["websocket", "polling"],
          },
        };
      }

      // In production, Socket.IO server is on the same server with custom path
      return {
        url: window.location.origin,
        options: {
          path: "/socket/socket.io/",
          auth: { token },
          transports: ["websocket", "polling"],
        },
      };
    };

    const { url, options } = getSocketConfig();

    // Create Socket.IO connection with authentication
    const socket = io(url, options);

    socketRef.current = socket;

    // Handle connection events
    socket.on("connect", () => {
      console.warn("Socket.IO connected");
      setConnectionStatus("connected");

      // Join the terminal session
      socket.emit("join_session", { session_id: sessionId });
    });

    socket.on("error", (data: { message: string }) => {
      console.error("Socket.IO error:", data.message);
    });

    socket.on("disconnect", (reason: string) => {
      console.warn("Socket.IO disconnected:", reason);
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Socket.IO connection error:", error);
      setConnectionStatus("disconnected");
    });
  }, [sessionId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  // Cleanup on unmount or sessionId change
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sessionId]);

  return {
    socket: socketRef.current,
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    isConnected: connectionStatus === "connected",
    isConnecting: connectionStatus === "connecting",
    isDisconnected: connectionStatus === "disconnected",
  };
}
