import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SessionsTable, type Session as TableSession } from "@/components/sessions/SessionsTable";
import { Plus, RefreshCw, Settings } from "lucide-react";
import { getSessions, checkCredentials, type Session as ApiSession } from "@/lib/api";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function SessionsPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  // Use a consistent userId across sessions
  const [userId] = useState(() => {
    // Check if userId already exists in localStorage
    const storedUserId = localStorage.getItem('gamgui-user-id');
    if (storedUserId) {
      return storedUserId;
    }
    
    // Generate a new userId and store it in localStorage
    const newUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('gamgui-user-id', newUserId);
    return newUserId;
  });
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<{
    complete: boolean;
    missingFiles: string[];
  }>({
    complete: false,
    missingFiles: [],
  });
  // Function to fetch all sessions
  const fetchSessions = async () => {
    try {
      setIsRefreshing(true);
      const response = await getSessions(userId);
      
      console.log("API Response:", response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Transform API sessions to table format
      const formattedSessions = Array.isArray(response.sessions) 
        ? response.sessions.map((session: ApiSession) => ({
            id: session.id,
            label: session.name,
            user: session.userId || "User", // Use userId from session if available
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
  
  // Check credentials status
  const checkCredentialsStatus = async () => {
    try {
      const response = await checkCredentials(userId);
      
      // Map the API response to our state structure
      if (response && response.localFiles) {
        setCredentialsStatus({
          complete: response.localFiles.complete,
          missingFiles: response.localFiles.missingFiles || []
        });
      }
    } catch (error) {
      console.error("Failed to check credentials status:", error);
    }
  };
  
  // Fetch all sessions and check credentials on component mount
  useEffect(() => {
    setIsLoading(true);
    fetchSessions();
    checkCredentialsStatus();
  }, [userId]); // Add userId as a dependency

  const handleRefresh = () => {
    fetchSessions();
  };

  const handleNewSession = () => {
    console.log("handleNewSession called"); // Add this log
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
      
      {/* Credentials warning */}
      {!credentialsStatus.complete && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <AlertTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Missing Credentials
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              You need to upload all required credentials before creating a session.
              {credentialsStatus.missingFiles.length > 0 && (
                <span> Missing files: {credentialsStatus.missingFiles.join(', ')}</span>
              )}
            </p>
            <Button 
              onClick={() => onNavigate ? onNavigate('/settings') : window.location.href = '/settings'} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Go to Settings
            </Button>
          </AlertDescription>
        </Alert>
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
