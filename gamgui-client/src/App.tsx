import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { SessionsPage } from "@/pages/sessions";
import { SettingsPage } from "@/pages/settings";
import { getApiBaseUrl } from "@/lib/api"; // Import API helper
import { NewSessionPage } from "@/pages/sessions/new";
import { SessionDetailPage } from "@/pages/sessions/[id]";

function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  // Fetch server version on mount
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const apiUrl = `${getApiBaseUrl()}/version`;
        console.log("Fetching server version from:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Server version response:", data);
        setServerVersion(data.version || 'unknown');
      } catch (error) {
        console.error("Failed to fetch server version:", error);
        setServerVersion('error');
      }
    };

    fetchVersion();
  }, []);

  // Update path when URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Handle navigation without page reload
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // Determine which page to render based on the current path
  const renderPage = () => {
    if (currentPath === "/settings") {
      return <SettingsPage />;
    }
    if (currentPath === "/sessions/new") {
      return <NewSessionPage onNavigate={navigate} />;
    }

    // Check if the path matches /sessions/{id} pattern
    const sessionMatch = currentPath.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch && sessionMatch[1] !== "new") {
      return <SessionDetailPage onNavigate={navigate} sessionId={sessionMatch[1]} />;
    }
    
    // Default to sessions page
    return <SessionsPage onNavigate={navigate} />;
  };

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar 
        userProfileProps={{
          name: "Bruno Oliveira",
          role: "Administrator"
        }}
        onNavigate={navigate}
        currentPath={currentPath}
        serverVersion={serverVersion} // Pass version to Sidebar
      />
      
      {/* Main content */}
      <main className="flex-1 p-6 md:ml-64">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
