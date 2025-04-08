import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { SessionsPage } from "@/pages/sessions";
import { SettingsPage } from "@/pages/settings";
import { NewSessionPage } from "@/pages/sessions/new";

function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

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
      />
      
      {/* Main content */}
      <main className="flex-1 p-6 md:ml-64">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
