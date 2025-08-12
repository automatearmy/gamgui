import type { Socket } from "socket.io-client";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

type TerminalProps = {
  socket?: Socket | null;
  isConnected: boolean;
};

export function Terminal({ socket, isConnected }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Setup terminal-specific socket event handlers
  useEffect(() => {
    if (!socket || !terminalInstanceRef.current)
      return;

    const terminal = terminalInstanceRef.current;

    // Handle terminal-specific events
    const handleOutput = (data: { data: string }) => {
      if (data.data) {
        terminal.write(data.data);
      }
    };

    const handleConnected = (data: { session_id: string }) => {
      console.log("Connected to terminal sesdsadasdsasion:", data.session_id);

      // Clear the terminal and show connection success
      terminal.clear();
      terminal.writeln("\x1B[1;32mConnected to terminal session!\x1B[0m");
      terminal.writeln("");

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
    };

    const handleError = (data: { message: string }) => {
      console.error("Socket.IO error:", data.message);
      terminal.writeln(`\x1B[1;31mError: ${data.message}\x1B[0m`);
    };

    const handleDisconnect = (reason: string) => {
      console.log("Socket.IO disconnected:", reason);
      terminal.writeln("\n\x1B[1;31mConnection closed\x1B[0m");
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket.IO connection error:", error);
      terminal.writeln("\x1B[1;31mConnection error\x1B[0m");
    };

    // Register event listeners
    socket.on("output", handleOutput);
    socket.on("connected", handleConnected);
    socket.on("error", handleError);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // Handle terminal input
    const handleTerminalData = (data: string) => {
      if (socket.connected) {
        socket.emit("terminal_input", { data });
      }
    };

    terminal.onData(handleTerminalData);

    return () => {
      // Cleanup event listeners
      socket.off("output", handleOutput);
      socket.off("connected", handleConnected);
      socket.off("error", handleError);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    // Create terminal instance
    const terminal = new XtermTerminal({
      scrollback: 0,
      theme: {
        background: "#171717",
      },
    });

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
    terminal.writeln("\x1B[1;32mWaiting for connection...\x1B[0m");
    terminal.writeln("");

    // Handle window resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();

        // Send resize event to backend after fitting
        const newCols = terminal.cols;
        const newRows = terminal.rows;

        if (socket?.connected) {
          console.log(`Sending resize: ${newCols}x${newRows}`);
          socket.emit("terminal_resize", {
            cols: newCols,
            rows: newRows,
          });
        }
      }
    };

    // Also handle xterm.js resize events directly
    terminal.onResize(({ cols, rows }) => {
      console.log(`Terminal resized: ${cols}x${rows}`);

      if (socket?.connected) {
        socket.emit("terminal_resize", {
          cols,
          rows,
        });
      }
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [socket]);

  return (
    <div className="flex flex-1 w-full h-full items-center justify-center rounded-sm overflow-hidden bg-[#171717] border p-6">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
}
