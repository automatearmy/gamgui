import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/ui/splash-screen";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingProvider } from "@/contexts/loading-context";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";
import { AppRoutes } from "@/routes";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <SplashScreen message="Initializing application..." />;
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
