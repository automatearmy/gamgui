import { Navigate } from "react-router-dom";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingSpinner fullPage size="xl" message="Verifying authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children wrapped in authenticated layout if authenticated
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
};
