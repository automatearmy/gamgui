import { useState } from "react";

import { CreateSessionModal } from "@/components/sessions/create-session-modal";
import { SessionsList } from "@/components/sessions/sessions-list";
import { SessionsSetupRequired } from "@/components/sessions/sessions-setup-required";
import { SessionsSkeleton } from "@/components/sessions/sessions-skeleton";
import { Button } from "@/components/ui/button";
import { useSecretsStatus } from "@/hooks/use-secrets";
import { useSessions } from "@/hooks/use-sessions";

export function SessionsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: sessions, isLoading: isSessionsLoading, error: isSessionsError } = useSessions();
  const { data: secretsStatus, isLoading: isSecretsLoading, isError: isSecretsError } = useSecretsStatus();

  const isLoading = isSessionsLoading || isSecretsLoading;
  const isError = isSessionsError || isSecretsError;

  const hasSessions = sessions && sessions.length > 0;
  const isConfigured = secretsStatus?.all_secrets_exist;

  const handleSessionCreate = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Create a new session to start running GAM commands.
          </p>
        </div>

        {hasSessions && isConfigured && (
          <CreateSessionModal>
            <Button>Create Session</Button>
          </CreateSessionModal>
        )}
      </div>

      {/* Show skeleton while loading */}
      {isLoading && <SessionsSkeleton />}

      {/* Show error state */}
      {isError && !isLoading && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Failed to load sessions. Please try again.</p>
        </div>
      )}

      {/* Show setup required if secrets aren't configured */}
      {!isLoading && !isError && !isConfigured && (
        <SessionsSetupRequired />
      )}

      {/* Show sessions list only if configured */}
      {!isLoading && !isError && isConfigured && (
        <SessionsList sessions={sessions ?? []} onSessionCreate={handleSessionCreate} />
      )}

      {/* Controlled modal for empty state */}
      {isConfigured && (
        <CreateSessionModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      )}
    </div>
  );
}
