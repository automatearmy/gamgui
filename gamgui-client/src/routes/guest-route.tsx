import { Navigate } from "react-router-dom";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

type GuestRouteProps = {
  children: React.ReactNode;
};

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage size="lg" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
