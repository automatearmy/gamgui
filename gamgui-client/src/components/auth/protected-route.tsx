import React from "react";

import { useAuth } from "../../lib/auth-context";

type ProtectedRouteProps = {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onNavigate }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    onNavigate("/login");

    // Return null to avoid flash of content
    return null;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
