import { AlertCircle } from "lucide-react";

import { SessionsHeader } from "@/components/sessions/sessions-header";
import { SessionsTable } from "@/components/sessions/sessions-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecretsStatus } from "@/hooks/use-secrets";
import { useSessions } from "@/hooks/use-sessions";

export function SessionsPage() {
  const { data: sessions, isLoading, error } = useSessions();
  const { data: secretsStatus } = useSecretsStatus();

  const hasSessions = sessions && sessions.length > 0;
  const isConfigured = secretsStatus?.all_secrets_exist;
  const showEmptyState = !isLoading && !error && !hasSessions;

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

      {showEmptyState && (
        <div className="text-center py-12">
          {!isConfigured ? (
            <>
              <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your Google Workspace credentials and create your first session to get started.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the "Configure" button above to set up your credentials, then create a new session.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium mb-2">Ready to create sessions</h3>
              <p className="text-sm text-muted-foreground">
                Your credentials are configured! Use the "New Session" button above to start managing your Google Workspace.
              </p>
            </>
          )}
        </div>
      )}

      <SessionsTable sessions={sessions} isLoading={isLoading} />
    </div>
  );
}
