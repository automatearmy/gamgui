import type { Socket } from "socket.io-client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "@xterm/xterm/css/xterm.css";

import { AUTHENTICATION_TOKEN_KEY } from "@/lib/constants/cookies";

type TerminalProps = {
  sessionId?: string;
};

export function Terminal({ sessionId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const connectSocket = (terminal: XtermTerminal, sessionId: string) => {
    setConnectionStatus("connecting");

    // Get the authentication token from cookies
    const token = Cookies.get(AUTHENTICATION_TOKEN_KEY);

    if (!token) {
      terminal.writeln("\x1B[1;31mError: No authentication token found\x1B[0m");
      setConnectionStatus("disconnected");
      return;
    }

    // Create Socket.IO connection with authentication (via proxy)
    const socket = io("http://localhost:8000/", {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // Handle connection events
    socket.on("connect", () => {
      console.log("Socket.IO connected");
      setConnectionStatus("connected");
      terminal.writeln("\x1B[1;32mConnected to Socket.IO server!\x1B[0m\n");

      // Join the terminal session
      socket.emit("join_session", { session_id: sessionId });
    });

    socket.on("connected", (data: { session_id: string }) => {
      console.log("Connected to terminal session:", data.session_id);
      terminal.writeln("\x1B[1;32mConnected to terminal session!\x1B[0m\n");

      // Send initial resize to sync terminal size
      setTimeout(() => {
        if (socket.connected) {
          console.log(`Sending initial resize: ${terminal.cols}x${terminal.rows}`);
          socket.emit("terminal_resize", {
            cols: terminal.cols,
            rows: terminal.rows,
          });
        }
      }, 100);
    });

    socket.on("output", (data: { data: string }) => {
      if (data.data) {
        terminal.write(data.data);
      }
    });

    socket.on("error", (data: { message: string }) => {
      console.error("Socket.IO error:", data.message);
      terminal.writeln(`\x1B[1;31mError: ${data.message}\x1B[0m`);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("Socket.IO disconnected:", reason);
      setConnectionStatus("disconnected");
      terminal.writeln("\n\x1B[1;31mConnection closed\x1B[0m");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Socket.IO connection error:", error);
      setConnectionStatus("disconnected");
      terminal.writeln("\x1B[1;31mConnection error\x1B[0m");
    });

    // Handle terminal input
    terminal.onData((data) => {
      if (socket.connected) {
        socket.emit("terminal_input", { data });
      }
    });
  };

  useEffect(() => {
    if (!terminalRef.current || !sessionId) {
      return;
    }

    // Create terminal instance with POC styling
    const terminal = new XtermTerminal();

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in the DOM
    terminal.open(terminalRef.current);

    // Fit terminal to container
    fitAddon.fit();

    // Store references
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Show welcome message
    terminal.writeln("\x1B[1;32mConnecting to terminal session...\x1B[0m");
    terminal.writeln("");

    // Connect to Socket.IO
    connectSocket(terminal, sessionId);

    // Handle window resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();

        // Send resize event to backend after fitting
        const newCols = terminal.cols;
        const newRows = terminal.rows;

        if (socketRef.current && socketRef.current.connected) {
          console.log(`Sending resize: ${newCols}x${newRows}`);
          socketRef.current.emit("terminal_resize", {
            cols: newCols,
            rows: newRows,
          });
        }
      }
    };

    // Also handle xterm.js resize events directly
    terminal.onResize(({ cols, rows }) => {
      console.log(`Terminal resized: ${cols}x${rows}`);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("terminal_resize", {
          cols,
          rows,
        });
      }
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      terminal.dispose();
    };
  }, [sessionId]);

  return (
    <div className="h-full w-full bg-muted border rounded-lg overflow-hidden shadow-sm">
      <div ref={terminalRef} className="h-full w-full" />
      {connectionStatus === "connecting" && (
        <div className="absolute top-4 right-4 bg-yellow-600 text-white px-2 py-1 rounded text-sm">
          Connecting...
        </div>
      )}
      {connectionStatus === "disconnected" && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-2 py-1 rounded text-sm">
          Disconnected
        </div>
      )}
    </div>
  );
}
