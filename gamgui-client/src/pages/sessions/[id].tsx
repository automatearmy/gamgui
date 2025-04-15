import { useState, useEffect, useRef } from "react";
import { Terminal } from "@/components/ui/terminal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { endSession, uploadSessionFiles, getSession, type Session } from "@/lib/api";
import { createTerminalConnection } from "@/lib/socket";
import { RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File } from "lucide-react";

interface SessionDetailPageProps {
  onNavigate?: (path: string) => void;
  sessionId?: string;
}

export function SessionDetailPage({ onNavigate, sessionId }: SessionDetailPageProps) {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [email] = useState("user@edu.edu");
  const [date] = useState(new Date().toLocaleDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Session | null>(null);
  
  const socketRef = useRef<any>(null);
  
  const fetchSessionDetails = async (id: string) => {
    try {
      setIsRefreshing(true);
      
      console.log(`Fetching session details for ID: ${id}`);
      const response = await getSession(id);
      console.log("Session API response:", response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.session) {
        throw new Error("Session not found. The session may have been deleted or may not exist.");
      }
      
      setSessionDetails(response.session);
      setError(null);
      
      // Connect to the terminal socket if not already connected
      if (!socketRef.current) {
        connectToTerminal(id);
      }
      
      return true;
    } catch (err) {
      console.error("Failed to fetch session details:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch session details");
      return false;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const connectToTerminal = (id: string) => {
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Connect to the terminal socket
    const socket = createTerminalConnection(id);
    socketRef.current = socket;
    
    socket.on('terminal-output', (data) => {
      setTerminalOutput(prev => [...prev, data]);
    });
    
    socket.on('error', (data) => {
      setTerminalOutput(prev => [...prev, `Error: ${data.message}`]);
    });
    
    socket.on('terminal-closed', () => {
      setTerminalOutput(prev => [...prev, "Terminal session closed"]);
    });
    
    return socket;
  };
  
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setIsLoading(false);
      return;
    }
    
    fetchSessionDetails(sessionId);
    
    return () => {
      // Cleanup socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId]);
  
  const handleRefresh = async () => {
    if (!sessionId) return;
    await fetchSessionDetails(sessionId);
  };
  
  const handleCommand = (command: string) => {
    if (!socketRef.current) return;
    
    // Add the command to the terminal output
    setTerminalOutput(prev => [...prev, `$: > ${command}`]);
    
    // Send the command to the server
    socketRef.current.emit('terminal-input', command + '\n');
  };
  
  const handleFilesDropped = async (files: File[]) => {
    if (!sessionId || !files.length) return;
    
    try {
      // Add the files to the uploaded files list
      setUploadedFiles(prev => [...prev, ...files]);
      
      // Upload the files to the server
      await uploadSessionFiles(sessionId, files);
      
      // Notify in terminal
      setTerminalOutput(prev => [
        ...prev, 
        `Uploaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}`
      ]);
    } catch (err) {
      console.error("Failed to upload files:", err);
      setTerminalOutput(prev => [
        ...prev, 
        `Error uploading files: ${err instanceof Error ? err.message : "Unknown error"}`
      ]);
    }
  };
  
  const handleEndSession = async () => {
    if (!sessionId) return;
    
    try {
      await endSession(sessionId);
      if (onNavigate) {
        onNavigate('/');
      } else {
        // Fallback for direct navigation
        window.location.href = '/';
      }
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading session details...</div>;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Session Error</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 text-center">
          <p>{error}</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Retry'}
          </Button>
          
          <Button onClick={() => onNavigate ? onNavigate('/') : window.location.href = '/'}>
            Return to Sessions
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-medium">
          Sessions / {sessionDetails?.name || 'Session'} - {email} - {date}
        </h1>
        <div className="flex items-center gap-2">
          {sessionDetails?.status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              sessionDetails.status === 'running' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {sessionDetails.status}
            </span>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh} 
            disabled={isRefreshing}
            title="Refresh session"
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="destructive" onClick={handleEndSession}>
            End Session
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Terminal */}
        <Terminal 
          className="flex-1" 
          output={terminalOutput}
          onCommand={handleCommand}
        />
        
        {/* File upload sidebar */}
        <Card className="w-80 p-4 flex flex-col h-full">
          <h2 className="text-lg font-medium mb-4">Add Files</h2>
          <FileDropZone 
            className="h-32 mb-4" 
            onFilesDropped={handleFilesDropped}
          />
          <p className="text-sm text-muted-foreground text-center mt-2 mb-4">
            Files will be added to /uploaded-files
          </p>
          
          {/* List of uploaded files */}
          {uploadedFiles.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0">
              <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
              <ScrollArea className="flex-1 rounded-md border">
                <div className="p-2">
                  <ul className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted">
                        <File className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1"></div>
          )}
          
          {/* Session details */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Session Info</h3>
            <ul className="space-y-1 text-xs">
              <li><span className="text-muted-foreground">ID:</span> {sessionDetails?.id || 'N/A'}</li>
              <li><span className="text-muted-foreground">Image:</span> {sessionDetails?.imageName || 'N/A'}</li>
              <li><span className="text-muted-foreground">Created:</span> {sessionDetails?.createdAt ? new Date(sessionDetails.createdAt).toLocaleString() : 'N/A'}</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
