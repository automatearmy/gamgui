import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingProvider } from "@/contexts/loading-context";
import { queryClient } from "@/lib/query-client";
import { AppRoutes } from "@/routes";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors />
        </AuthProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}
