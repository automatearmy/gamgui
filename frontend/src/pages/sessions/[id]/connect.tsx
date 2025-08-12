import {
  MoreVertical,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { FileUploadPopover } from "@/components/sessions/file-upload-popover";
import { SessionDetailsModal } from "@/components/sessions/session-details-modal";
import { SessionStatus } from "@/components/sessions/session-status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Terminal } from "@/components/ui/terminal";
import { useSessionConnection } from "@/hooks/use-session-connection";
import { useSession } from "@/hooks/use-sessions";
import { cn } from "@/lib/utils";

export function SessionConnectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading: isSessionLoading } = useSession(id!);
  const {
    socket,
    connect,
    disconnect,
    isConnected,
    isConnecting,
  } = useSessionConnection(id);

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    window.location.reload();
  };

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
    }
    else {
      connect();
    }
  };

  // Auto-connect when session is loaded and running
  useEffect(() => {
    if (session && session.status === "Running" && !isConnected && !isConnecting) {
      connect();
    }
  }, [session, isConnected, isConnecting, connect]);

  if (isSessionLoading) {
    return (
      <div className="flex flex-col w-full h-full overflow-hidden">
        <div className="lg:flex lg:items-center lg:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="mt-2 h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3 lg:ml-4 lg:mt-0">
            <div className="h-9 w-20 bg-muted animate-pulse rounded" />
            <div className="h-9 w-28 bg-muted animate-pulse rounded" />
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            <div className="h-9 w-9 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header Section */}
      <div className="lg:flex lg:items-center lg:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {`Session ${session.name}`}
          </h1>
          <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="flex items-center">
              <SessionStatus status={session.status} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 lg:ml-4 lg:mt-0">
          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          {/* Upload Files Button */}
          <FileUploadPopover sessionId={id!}>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </FileUploadPopover>

          {/* Connection Status Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleConnection}
            disabled={isConnecting}
            className={cn(
              "transition-colors",
              isConnected ? "border-green-200 hover:border-green-300" : "border-red-200 hover:border-red-300",
            )}
          >
            <span className={cn(
              "mr-2 h-2 w-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500",
            )}
            />
            {isConnecting ? "Connecting..." : (isConnected ? "Connected" : "Disconnected")}
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/sessions/${id}/logs`}>
                  Logs
                </Link>
              </DropdownMenuItem>
              <SessionDetailsModal session={session}>
                <DropdownMenuItem onSelect={e => e.preventDefault()}>
                  Details
                </DropdownMenuItem>
              </SessionDetailsModal>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Terminal Section */}
      <div className="flex-1 min-h-0">
        <Terminal socket={socket} isConnected={isConnected} />
      </div>
    </div>
  );
}
