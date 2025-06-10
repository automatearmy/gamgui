import { AlertCircle } from "lucide-react";

import { SessionsHeader } from "@/components/sessions/sessions-header";
import { SessionsTable } from "@/components/sessions/sessions-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSessions } from "@/hooks/use-sessions";

export function SessionsPage() {
  const { data: sessions, isLoading, error } = useSessions();

  return (
    <div className="space-y-8 py-6">
      <SessionsHeader />

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load sessions. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      <SessionsTable sessions={sessions} isLoading={isLoading} />
    </div>
  );
}
