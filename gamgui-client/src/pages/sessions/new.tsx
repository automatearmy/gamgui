import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Terminal } from "@/components/ui/terminal";
import { checkCredentials, createSession, endSession, getImages, uploadSessionFiles } from "@/lib/api";
import { createTerminalConnection } from "@/lib/socket";

type NewSessionPageProps = {
  onNavigate?: (path: string) => void;
};

export function NewSessionPage({ onNavigate }: NewSessionPageProps = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [email] = useState("user@edu.edu");
  const [userId] = useState(() => {
    // Check if userId already exists in localStorage
    const storedUserId = localStorage.getItem("gamgui-user-id");
    if (storedUserId) {
      return storedUserId;
    }

    // Generate a new userId and store it in localStorage
    const newUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("gamgui-user-id", newUserId);
    return newUserId;
  });
  const [date] = useState(new Date().toLocaleDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<any>(null);

  // Create a new session when the component mounts
  useEffect(() => {
    const initSession = async () => {
      try {
        setIsLoading(true);

        // Check if credentials are available
        const credentialsResponse = await checkCredentials(userId);

        // If credentials are not complete, redirect to settings page
        if (!credentialsResponse.localFiles?.complete) {
          setError("Missing credentials. Please upload all required credentials in Settings before creating a session.");
          setIsLoading(false);
          return;
        }

        // Get available images
        const imagesResponse = await getImages();

        // Create a new session with an image ID if available, or null to use the default image
        let imageId = null;
        if (imagesResponse && Array.isArray(imagesResponse) && imagesResponse.length > 0) {
          imageId = imagesResponse[0].id;
        }

        // Create a new session with userId
        const response = await createSession("New Session", imageId, {}, undefined, userId);

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
        }
        else {
          // Fallback for direct navigation
          window.location.href = `/sessions/${newSessionId}`;
        }

        setIsLoading(false);
      }
      catch (err) {
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
  }, [onNavigate, userId]);

  // Connect to the terminal socket when sessionId is available
  useEffect(() => {
    if (!sessionId)
      return;

    const socket = createTerminalConnection(sessionId);
    socketRef.current = socket;

    socket.on("terminal-output", (data) => {
      setTerminalOutput(prev => [...prev, data]);
    });

    socket.on("error", (data) => {
      setTerminalOutput(prev => [...prev, `Error: ${data.message}`]);
    });

    socket.on("terminal-closed", () => {
      setTerminalOutput(prev => [...prev, "Terminal session closed"]);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const handleCommand = (command: string) => {
    if (!socketRef.current)
      return;

    // Add the command to the terminal output
    setTerminalOutput(prev => [...prev, `$: > ${command}`]);

    // Send the command to the server
    socketRef.current.emit("terminal-input", `${command}\n`);
  };

  const handleFilesDropped = async (files: File[]) => {
    if (!sessionId || !files.length)
      return;

    try {
      // Add the files to the uploaded files list
      setUploadedFiles(prev => [...prev, ...files]);

      // Upload the files to the server
      await uploadSessionFiles(sessionId, files);

      // Notify in terminal
      setTerminalOutput(prev => [
        ...prev,
        `Uploaded ${files.length} file(s): ${files.map(f => f.name).join(", ")}`,
      ]);
    }
    catch (err) {
      console.error("Failed to upload files:", err);
      setTerminalOutput(prev => [
        ...prev,
        `Error uploading files: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId)
      return;

    try {
      await endSession(sessionId);
      if (onNavigate) {
        onNavigate("/");
      }
      else {
        // Fallback for direct navigation
        window.location.href = "/";
      }
    }
    catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error) {
    // Check if the error is about missing credentials
    const isMissingCredentialsError = error.includes("Missing credentials");

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Error</h2>
        <p className="text-center mb-6">{error}</p>
        <div className="flex gap-4">
          {isMissingCredentialsError && (
            <Button
              onClick={() => onNavigate ? onNavigate("/settings") : window.location.href = "/settings"}
              className="mt-4"
              variant="default"
            >
              Go to Settings
            </Button>
          )}
          <Button
            onClick={() => onNavigate ? onNavigate("/") : window.location.href = "/"}
            className="mt-4"
            variant={isMissingCredentialsError ? "outline" : "default"}
          >
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
          Sessions / New Session -
          {" "}
          {email}
          {" "}
          -
          {" "}
          {date}
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
