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

  // Track current command for output capture
  const currentCommandRef = useRef<{
    command: string;
    startTime: number;
    output: string[];
  } | null>(null);

  const persistCommandWithOutput = async (command: string, output: string, exitCode: number, duration: number) => {
    try {
      const token = Cookies.get(AUTHENTICATION_TOKEN_KEY);
      if (token && id) {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/sessions/${id}/commands`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Access-Token": token,
          },
          body: JSON.stringify({
            command,
            output,
            exit_code: exitCode,
            duration,
          }),
        });

        if (response.ok) {
          console.log("✅ Command with output persisted to API");
        } else {
          console.warn("⚠️ Failed to persist command to API:", response.status);
        }
      }
    } catch (error) {
      console.warn("⚠️ Error persisting command to API:", error);
    }
  };

  // API-based history functions with localStorage fallback
  const getStorageKey = (suffix: string) => `gamgui-session-${id}-${suffix}`;

  const saveToLocalStorage = useCallback((output: string[]) => {
    if (!id) {
      return;
    }
    try {
      localStorage.setItem(getStorageKey("output"), JSON.stringify(output));
      localStorage.setItem(getStorageKey("timestamp"), new Date().toISOString());
    }
    catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  }, [id]);

  const loadFromLocalStorage = useCallback(() => {
    if (!id) {
      return null;
    }
    try {
      const savedOutput = localStorage.getItem(getStorageKey("output"));
      if (savedOutput) {
        return {
          output: JSON.parse(savedOutput) as string[],
          timestamp: localStorage.getItem(getStorageKey("timestamp")) || null,
        };
      }
    }
    catch (error) {
      console.warn("Failed to load from localStorage:", error);
    }
    return null;
  }, [id]);

  const loadFromAPI = useCallback(async () => {
    if (!id) return null;
    try {
      // Use the existing API client from sessions
      const { getSessionHistory } = await import("@/api/sessions");
      const response = await getSessionHistory(id);
      
      if (response.success && response.data && response.data.length > 0) {
        // Convert API history to terminal output format
        const output: string[] = [];

        response.data.forEach((cmd: any) => {
          output.push(`$ ${cmd.command}`);

          // Use full output if available, otherwise use preview
          const commandOutput = cmd.output || cmd.output_preview;
          if (commandOutput) {
            // Add the output as-is, preserving original formatting
            output.push(commandOutput);
          }

          // Add status message
          if (cmd.status === "completed") {
            output.push(cmd.exit_code === 0 ? "✅ Command completed successfully" : "❌ Command failed");
          }
          else if (cmd.status === "failed") {
            output.push("❌ Command failed");
          }
          else if (cmd.status === "cancelled") {
            output.push("⏹️ Command cancelled");
          }
        });

        return {
          output,
          timestamp: new Date().toISOString(),
          source: "api",
        };
      }
    }
    catch (error) {
      console.warn("❌ Failed to load from API:", error);
    }
    return null;
  }, [id]);

  const clearLocalStorage = useCallback(() => {
    if (!id) return;
    try {
      localStorage.removeItem(getStorageKey("output"));
      localStorage.removeItem(getStorageKey("timestamp"));
    }
    catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }, [id]);

  // Load history from API only - focus on making API work
  useEffect(() => {
    const loadHistory = async () => {
      console.log("🔍 Loading session history from API for session:", id);
      
      try {
        const apiData = await loadFromAPI();
        console.log("📡 API response:", apiData);
        
        if (apiData && apiData.output.length > 0) {
          console.log("✅ Loaded history from API:", apiData.output.length, "lines");
          setTerminalOutput((prev) => {
            const systemMessages = prev.filter(line => 
              line.includes("Initializing connection...") ||
              line.includes("Connected to session")
            );
            return [...systemMessages, "📁 Restored session history (from server)", ...apiData.output];
          });
        } else {
          console.log("📭 No history found in API");
          // Try to call API directly to debug
          const { getSessionHistory } = await import("@/api/sessions");
          const response = await getSessionHistory(id!);
          console.log("🔍 Direct API call result:", response);
        }
      } catch (error) {
        console.error("❌ Error loading from API:", error);
      }
    };

    // Only load if we have a session ID
    if (id) {
      loadHistory();
    }
  }, [id, loadFromAPI]);

  // Save to localStorage whenever output changes
  useEffect(() => {
    if (terminalOutput.length > 0) {
      saveToLocalStorage(terminalOutput);
    }
  }, [terminalOutput, saveToLocalStorage]);

  // Periodic sync with API for cross-browser updates - only when needed
  useEffect(() => {
    if (!id) return;

    const syncInterval = setInterval(async () => {
      try {
        const { getSessionHistory } = await import("@/api/sessions");
        const response = await getSessionHistory(id);
        
        if (response.success && response.data && response.data.length > 0) {
          // Convert API history to terminal output format
          const apiOutput: string[] = [];
          
          response.data.forEach((cmd: any) => {
            apiOutput.push(`$ ${cmd.command}`);
            
            const commandOutput = cmd.output || cmd.output_preview;
            if (commandOutput) {
              apiOutput.push(commandOutput);
            }
            
            if (cmd.status === "completed") {
              apiOutput.push(cmd.exit_code === 0 ? "✅ Command completed successfully" : "❌ Command failed");
            }
            else if (cmd.status === "failed") {
              apiOutput.push("❌ Command failed");
            }
            else if (cmd.status === "cancelled") {
              apiOutput.push("⏹️ Command cancelled");
            }
          });

          // Only update if API has more content than current terminal
          setTerminalOutput((prev) => {
            const currentCommandCount = prev.filter(line => line.startsWith("$ ")).length;
            const apiCommandCount = apiOutput.filter(line => line.startsWith("$ ")).length;
            
            if (apiCommandCount > currentCommandCount) {
              console.log("✅ Updating with new commands from API");
              const systemMessages = prev.filter(line => 
                line.includes("Initializing connection...") ||
                line.includes("Connected to session") ||
                line.includes("📁 Restored session history") ||
                line.includes("🔄 Synced with server")
              );
              return [...systemMessages, "🔄 Synced with server", ...apiOutput];
            }
            return prev;
          });
        }
      } catch (error) {
        console.warn("❌ Failed to sync with API:", error);
      }
    }, 5000); // Check every 5 seconds (less frequent)

    return () => clearInterval(syncInterval);
  }, [id]); // Remove terminalOutput dependency to prevent excessive polling

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith(`gamgui-session-${id}-`)) {
        const savedData = loadFromLocalStorage();
        if (savedData) {
          setTerminalOutput(savedData.output);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [id, loadFromLocalStorage]);

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
        try {
          // Try to parse as JSON for structured messages
          const message = JSON.parse(event.data);

          if (message.type === "session_busy") {
            setTerminalOutput(prev => [...prev, "⚠️ Session is busy. Only one command can be executed at a time."]);
          }
          else if (message.type === "command_start") {
            setTerminalOutput(prev => [...prev, "🔄 Command started..."]);
          }
          else if (message.type === "command_complete") {
            const status = message.success ? "✅ Command completed successfully" : "❌ Command failed";
            setTerminalOutput(prev => [...prev, status]);
            
            // Persist command with captured output
            if (currentCommandRef.current) {
              const duration = Date.now() - currentCommandRef.current.startTime;
              const fullOutput = currentCommandRef.current.output.join("\n");
              const exitCode = message.success ? 0 : 1;
              
              persistCommandWithOutput(
                currentCommandRef.current.command,
                fullOutput,
                exitCode,
                duration
              );
              
              // Clear current command
              currentCommandRef.current = null;
            }
          }
          else if (message.type === "cancelled") {
            setTerminalOutput(prev => [...prev, "⏹️ Command cancelled"]);
            
            // Persist cancelled command
            if (currentCommandRef.current) {
              const duration = Date.now() - currentCommandRef.current.startTime;
              const fullOutput = currentCommandRef.current.output.join("\n");
              
              persistCommandWithOutput(
                currentCommandRef.current.command,
                fullOutput,
                -1, // Exit code for cancelled
                duration
              );
              
              currentCommandRef.current = null;
            }
          }
          else if (message.type === "output") {
            // Handle structured output messages
            setTerminalOutput(prev => [...prev, message.data]);
            
            // Capture output for persistence
            if (currentCommandRef.current) {
              currentCommandRef.current.output.push(message.data);
            }
          }
          else if (message.type === "welcome") {
            // Don't show welcome JSON, just show clean message
            return;
          }
          else if (message.type === "debug") {
            // Show debug messages for persistence troubleshooting
            setTerminalOutput(prev => [...prev, `🔥 DEBUG: ${message.message}`]);
          }
          else {
            // For other JSON messages, don't display them as terminal output
            console.log("Received structured message:", message);
          }
        }
        catch {
          // Not JSON, treat as regular terminal output
          const output = event.data;
          setTerminalOutput(prev => [...prev, output]);
          
          // Capture raw output for persistence
          if (currentCommandRef.current) {
            currentCommandRef.current.output.push(output);
          }
        }
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
    clearLocalStorage(); // Clear saved history when terminal is cleared
  };

  const sendCommand = async (command: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      // Track command for output capture
      currentCommandRef.current = {
        command,
        startTime: Date.now(),
        output: [],
      };

      // Send command as plain text - backend handles everything
      websocketRef.current.send(command);
      setTerminalOutput(prev => [...prev, `$ ${command}`]);

      // IMMEDIATELY persist the command (don't wait for WebSocket completion)
      // This ensures commands are saved even if WebSocket doesn't send structured messages
      setTimeout(async () => {
        if (currentCommandRef.current && currentCommandRef.current.command === command) {
          const duration = Date.now() - currentCommandRef.current.startTime;
          const output = currentCommandRef.current.output.join("\n") || "Command executed";
          
          console.log("🔄 Auto-persisting command after 3 seconds:", command);
          await persistCommandWithOutput(command, output, 0, duration);
          
          // Clear the command ref
          currentCommandRef.current = null;
        }
      }, 3000); // Wait 3 seconds for output, then persist
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
        return "default";
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

          {/* Connection Badge */}
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

          {/* Close button */}
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
      <div className="h-[calc(100vh-12rem)]">
        <CustomTerminal
          output={terminalOutput}
          onCommand={sendCommand}
          className="h-full"
        />
      </div>

      {/* Floating Action Button */}
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
