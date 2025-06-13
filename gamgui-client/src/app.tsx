import { QueryClientProvider } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingProvider } from "@/contexts/loading-context";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";
import { AppRoutes } from "@/routes";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" message="Loading GAMGUI..." />
      </div>
    );
  }

  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}

export default App;
