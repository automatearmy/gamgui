import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { SessionsPage } from "@/pages/sessions";
import { SettingsPage } from "@/pages/settings";
import { getApiBaseUrl } from "@/lib/api"; // Import API helper
import { NewSessionPage } from "@/pages/sessions/new";
import { SessionDetailPage } from "@/pages/sessions/[id]";
import { AuthProviderWithGoogle } from "@/lib/authContext";
import { useAuth } from "@/lib/authContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LoginPage from "@/pages/auth/LoginPage";

// Wrapper component to access auth context
function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const { user } = useAuth();

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
    // Login page
    if (currentPath === "/login") {
      return <LoginPage onNavigate={navigate} />;
    }

    // Protected routes
    if (currentPath === "/settings") {
      return (
        <ProtectedRoute onNavigate={navigate}>
          <SettingsPage />
        </ProtectedRoute>
      );
    }
    
    if (currentPath === "/sessions/new") {
      return (
        <ProtectedRoute onNavigate={navigate}>
          <NewSessionPage onNavigate={navigate} />
        </ProtectedRoute>
      );
    }

    // Check if the path matches /sessions/{id} pattern
    const sessionMatch = currentPath.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch && sessionMatch[1] !== "new") {
      return (
        <ProtectedRoute onNavigate={navigate}>
          <SessionDetailPage onNavigate={navigate} sessionId={sessionMatch[1]} />
        </ProtectedRoute>
      );
    }

    // Default to sessions page (protected)
    return (
      <ProtectedRoute onNavigate={navigate}>
        <SessionsPage onNavigate={navigate} />
      </ProtectedRoute>
    );
  };

  // Only show sidebar for authenticated routes
  const showSidebar = currentPath !== "/login";

  // Create user profile props from authenticated user
  const userProfileProps = {
    name: user?.name || "User",
    role: user?.domain ? `@${user.domain}` : "User"
  };

  return (
    <div className="flex min-h-svh bg-background">
      {showSidebar && (
        <Sidebar
          userProfileProps={userProfileProps}
          onNavigate={navigate}
          currentPath={currentPath}
          serverVersion={serverVersion} // Pass version to Sidebar
        />
      )}

      {/* Main content */}
      <main className={`flex-1 p-6 ${showSidebar ? 'md:ml-64' : ''}`}>
        {renderPage()}
      </main>
    </div>
  );
}

// Main App component with Auth Provider
function App() {
  return (
    <AuthProviderWithGoogle>
      <AppContent />
    </AuthProviderWithGoogle>
  );
}

export default App;
