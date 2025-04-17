import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SessionsTable, type Session as TableSession } from "@/components/sessions/SessionsTable";
import { Plus, RefreshCw } from "lucide-react";
import { getSessions, type Session as ApiSession } from "@/lib/api";

export function SessionsPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Function to fetch all sessions
  const fetchSessions = async () => {
    try {
      setIsRefreshing(true);
      const response = await getSessions();
      
      console.log("API Response:", response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Transform API sessions to table format
      const formattedSessions = Array.isArray(response.sessions) 
        ? response.sessions.map((session: ApiSession) => ({
            id: session.id,
            label: session.name,
            user: "User", // Could be extracted from session data if available
            date: new Date(session.createdAt).toLocaleDateString(),
            isHighlighted: session.status === "running",
          }))
        : [];
      
      console.log("Formatted Sessions:", formattedSessions);
      
      setSessions(formattedSessions);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Fetch all sessions on component mount
  useEffect(() => {
    setIsLoading(true);
    fetchSessions();
  }, []);

  const handleRefresh = () => {
    fetchSessions();
  };

  const handleNewSession = () => {
    if (onNavigate) {
      onNavigate("/sessions/new");
    } else {
      // Fallback for direct navigation
      window.location.href = "/sessions/new";
    }
  };

  const handleViewSession = (sessionId: string) => {
    if (onNavigate) {
      onNavigate(`/sessions/${sessionId}`);
    } else {
      // Fallback for direct navigation
      window.location.href = `/sessions/${sessionId}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <Button disabled className="shrink-0">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
        <div className="flex items-center justify-center p-8">
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            title="Refresh sessions"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button onClick={handleNewSession} className="shrink-0">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-500">
          <p>Error: {error}</p>
          <Button variant="link" onClick={handleRefresh} className="p-0 h-auto text-red-600">
            Try again
          </Button>
        </div>
      )}

      {/* Sessions Table */}
      {sessions.length > 0 ? (
        <SessionsTable sessions={sessions} onViewSession={handleViewSession} />
      ) : (
        <div className="flex items-center justify-center p-8 border rounded-md">
          <p className="text-muted-foreground">No sessions found. Create a new session to get started.</p>
        </div>
      )}
    </div>
  );
}
