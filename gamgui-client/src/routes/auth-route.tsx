import { Navigate } from "react-router-dom";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

type AuthRouteProps = {
  children: React.ReactNode;
};

export function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
