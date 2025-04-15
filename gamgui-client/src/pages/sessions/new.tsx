import { useState, useEffect, useRef } from "react";
import { Terminal } from "@/components/ui/terminal";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSession, endSession, uploadSessionFiles, getImages } from "@/lib/api";
import { createTerminalConnection } from "@/lib/socket";

interface NewSessionPageProps {
  onNavigate?: (path: string) => void;
}

export function NewSessionPage({ onNavigate }: NewSessionPageProps = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [email] = useState("user@edu.edu");
  const [date] = useState(new Date().toLocaleDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);
  
  // Create a new session when the component mounts
  useEffect(() => {
    const initSession = async () => {
      try {
        setIsLoading(true);
        
        // Get available images
        const imagesResponse = await getImages();
        if (!imagesResponse || !Array.isArray(imagesResponse) || imagesResponse.length === 0) {
          // Redirect to settings page if no images are available
          if (onNavigate) {
            onNavigate("/settings");
          } else {
            window.location.href = "/settings";
          }
          throw new Error("No Docker images available. Please create an image in Settings first.");
        }
        
        // Use the first available image
        const defaultImage = imagesResponse[0];
        
        // Create a new session
        const response = await createSession("New Session", defaultImage.id);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        if (!response.session || !response.session.id) {
          throw new Error("Failed to create session: invalid response from server");
        }
        
        const newSessionId = response.session.id;
        setSessionId(newSessionId);
        
        // Navigate to the session detail page
        if (onNavigate) {
          onNavigate(`/sessions/${newSessionId}`);
        } else {
          // Fallback for direct navigation
          window.location.href = `/sessions/${newSessionId}`;
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize session:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize session");
        setIsLoading(false);
      }
    };
    
    initSession();
    
    // Clean up function to end the session when the component unmounts
    return () => {
      if (sessionId) {
        endSession(sessionId).catch(console.error);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onNavigate]);
  
  // Connect to the terminal socket when sessionId is available
  useEffect(() => {
    if (!sessionId) return;
    
    const socket = createTerminalConnection(sessionId);
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
    
    return () => {
      socket.disconnect();
    };
  }, [sessionId]);
  
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
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Error</h2>
        <p>{error}</p>
        <Button onClick={() => onNavigate ? onNavigate('/') : window.location.href = '/'} className="mt-4">
          Return to Sessions
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-medium">
          Sessions / New Session - {email} - {date}
        </h1>
        <Button variant="destructive" onClick={handleEndSession}>
          End Session
        </Button>
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
        <Card className="w-80 p-4 flex flex-col">
          <h2 className="text-lg font-medium mb-4">Add Files</h2>
          <FileDropZone 
            className="flex-1 mb-4" 
            onFilesDropped={handleFilesDropped}
          />
          <p className="text-sm text-muted-foreground text-center mt-2">
            Files will be added to /uploaded-files
          </p>
          
          {/* List of uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
              <ul className="space-y-1">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="text-sm truncate">{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
