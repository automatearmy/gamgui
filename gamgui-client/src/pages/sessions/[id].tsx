import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { SessionStatus } from "@/components/sessions/session-status";
import { CustomTerminal } from "@/components/ui/custom-terminal";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSession } from "@/hooks/use-sessions";
import { AUTHENTICATION_TOKEN_KEY } from "@/lib/constants/cookies";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading, error } = useSession(id!);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    if (!session?.websocket_url)
      return;

    setConnectionStatus("connecting");

    try {
      // Get authentication token from cookies
      const token = Cookies.get(AUTHENTICATION_TOKEN_KEY);
      if (!token) {
        setConnectionStatus("error");
        setTerminalOutput(prev => [...prev, "Authentication token not found"]);
        return;
      }

      // Append token to websocket URL
      const wsUrl = `${session.websocket_url}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        setTerminalOutput(prev => [...prev, "Connected to session"]);
      };

      ws.onmessage = (event) => {
        setTerminalOutput(prev => [...prev, event.data]);
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        setTerminalOutput(prev => [...prev, "Connection closed"]);
      };

      ws.onerror = () => {
        setConnectionStatus("error");
        setTerminalOutput(prev => [...prev, "Connection error"]);
      };
    }
    catch {
      setConnectionStatus("error");
      setTerminalOutput(prev => [...prev, "Failed to connect"]);
    }
  };

  const sendCommand = (command: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(command);
      setTerminalOutput(prev => [...prev, `$ ${command}`]);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    // TODO: Implement file upload to session
    console.log("Files to upload:", files);
    setTerminalOutput(prev => [...prev, `Uploaded ${files.length} file(s)`]);
  };

  useEffect(() => {
    if (session?.websocket_url) {
      setTerminalOutput(prev => [...prev, "Initializing connection..."]);
      connectWebSocket();
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [session]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Loading Session...</h1>
              <p className="text-muted-foreground">Fetching session details</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-yellow-600 bg-yellow-50 border-yellow-200">
                Loading...
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-screen flex flex-col">
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-red-600">Session Error</h1>
              <p className="text-muted-foreground">Failed to load session</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-red-600 bg-red-50 border-red-200">
                Error
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600">Session not found</p>
            <p className="text-muted-foreground">The requested session could not be found or failed to load</p>
          </div>
        </div>
      </div>
    );
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600 bg-green-50 border-green-200";
      case "connecting":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <p className="text-muted-foreground">{session.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <SessionStatus status={session.status} />
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getConnectionStatusColor()}`}>
              {connectionStatus === "connecting" && "Connecting..."}
              {connectionStatus === "connected" && "Connected"}
              {connectionStatus === "disconnected" && "Disconnected"}
              {connectionStatus === "error" && "Connection Error"}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - File upload */}
        <div className="w-80 border-r bg-gray-50 p-4 flex-shrink-0">
          <h3 className="font-medium mb-4">File Upload</h3>
          <FileDropZone
            onFilesDropped={handleFileUpload}
            className="h-48"
          />
        </div>

        {/* Right side - Terminal */}
        <div className="flex-1 p-4 min-w-0 overflow-hidden">
          <CustomTerminal
            output={terminalOutput}
            onCommand={sendCommand}
          />
        </div>
      </div>
    </div>
  );
}
