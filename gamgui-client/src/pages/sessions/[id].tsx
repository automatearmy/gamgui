import Cookies from "js-cookie";
import { Download, MoreVertical, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { SessionStatus } from "@/components/sessions/session-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomTerminal } from "@/components/ui/custom-terminal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSession } from "@/hooks/use-sessions";
import { AUTHENTICATION_TOKEN_KEY } from "@/lib/constants/cookies";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useSession(id!);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
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
  }, [session?.websocket_url]);

  const handleCloseSession = () => {
    // Close websocket connection if open
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    navigate("/sessions");
  };

  const handleRestartSession = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    setTimeout(() => {
      connectWebSocket();
    }, 1000);
  };

  const handleDownloadLogs = () => {
    if (!session)
      return;
    const logs = terminalOutput.join("\n");
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name}-logs-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearTerminal = () => {
    setTerminalOutput([]);
  };

  const sendCommand = (command: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(command);
      setTerminalOutput(prev => [...prev, `$ ${command}`]);
    }
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
  }, [session, connectWebSocket]);

  // Add keyboard shortcut for ESC key to exit session
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseSession();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Loading Session...</h1>
            <p className="text-muted-foreground">Fetching session details</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-red-600">Session Error</h1>
            <p className="text-muted-foreground">Failed to load session</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600">Session not found</p>
            <p className="text-muted-foreground">The requested session could not be found or failed to load</p>
          </div>
        </div>
      </div>
    );
  }

  const getConnectionBadgeVariant = () => {
    switch (connectionStatus) {
      case "connected":
        return "default"; // Green like Running status
      case "connecting":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getConnectionBadgeText = () => {
    switch (connectionStatus) {
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Connected";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Connection Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Clean minimal header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{session.name}</h1>
          <p className="text-sm text-muted-foreground">{session.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <SessionStatus status={session.status} />

          {/* Animated Connection Badge - now green when connected */}
          <Badge
            variant={getConnectionBadgeVariant()}
            className={`
              ${connectionStatus === "connected" ? "bg-green-100 text-green-800 border-green-200" : ""}
              ${connectionStatus === "connecting" ? "animate-bounce" : ""}
              transition-all duration-300
            `}
          >
            {connectionStatus === "connecting" && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-current rounded-full animate-ping" />
                <div className="w-1 h-1 bg-current rounded-full animate-ping delay-100" />
                <div className="w-1 h-1 bg-current rounded-full animate-ping delay-200" />
                <span className="ml-2">Connecting...</span>
              </div>
            )}
            {connectionStatus !== "connecting" && getConnectionBadgeText()}
          </Badge>

          {/* Subtle close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseSession}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Terminal - clean and full screen */}
      <div className="h-[calc(100vh-10rem)]">
        <CustomTerminal
          output={terminalOutput}
          onCommand={sendCommand}
          className="h-full"
        />
      </div>

      {/* Floating Action Button - repositioned to bottom-right */}
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleRestartSession}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Restart Session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadLogs}>
              <Download className="mr-2 h-4 w-4" />
              Download Logs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClearTerminal}>
              <X className="mr-2 h-4 w-4" />
              Clear Terminal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
