import { AlertCircle, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecretsStatus } from "@/hooks/use-secrets";

import { CreateSessionModal } from "./create-session-modal";

export function SessionsHeader() {
  const { data: secretsStatus, isLoading } = useSecretsStatus();

  const isConfigured = secretsStatus?.all_secrets_exist;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Manage your active Google Workspace management sessions.
        </p>
      </div>

      {/* Configuration Status Alert */}
      {!isLoading && !isConfigured && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Configuration required before creating sessions.
            {" "}
            <Link to="/settings" className="font-medium underline hover:no-underline">
              Complete setup in Settings
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLoading
            ? (
                <Skeleton className="h-6 w-32" />
              )
            : (
                <span className="text-sm text-muted-foreground">
                  {isConfigured ? "Ready to create sessions" : "Setup required"}
                </span>
              )}
        </div>

        <div className="flex items-center gap-2">
          {!isConfigured && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Link>
            </Button>
          )}

          {isConfigured
            ? (
                <CreateSessionModal>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Session
                  </Button>
                </CreateSessionModal>
              )
            : (
                <Button disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  New Session
                </Button>
              )}
        </div>
      </div>
    </div>
  );
}
