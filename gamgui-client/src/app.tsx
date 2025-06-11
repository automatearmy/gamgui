import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { queryClient } from "@/lib/query-client";
import { AppRoutes } from "@/routes";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
