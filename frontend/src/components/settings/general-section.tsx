import { Server } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useEnvironmentInfo, useHealthCheck } from "@/hooks/use-health";

export function GeneralSection() {
  const { data: health, isLoading: healthLoading } = useHealthCheck();
  const { data: envInfo, isLoading: envLoading } = useEnvironmentInfo();

  const isLoading = healthLoading || envLoading;

  return (
    <div className="space-y-4">

      <div className="space-y-1">
        <h2 className="text-lg font-medium">General</h2>
        <p className="text-sm text-muted-foreground">
          System information and API health status.
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <div className="grid gap-6">
            {/* API Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Server className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">API Status</p>
                  <p className="text-xs text-muted-foreground">Backend health and connectivity</p>
                </div>
              </div>
            </div>

            {/* System Information Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="space-y-1">
                <span className="font-medium">Application</span>
                <p className="text-muted-foreground">GAMGUI</p>
              </div>
              <div className="space-y-1">
                <span className="font-medium">Version</span>
                {isLoading
                  ? <Skeleton className="h-4 w-12" />
                  : <p className="text-muted-foreground">{health?.version || "Unknown"}</p>}
              </div>
              <div className="space-y-1">
                <span className="font-medium">Environment</span>
                {isLoading
                  ? <Skeleton className="h-4 w-20" />
                  : <p className="text-muted-foreground">{health?.environment || "Unknown"}</p>}
              </div>
              <div className="space-y-1">
                <span className="font-medium">Project ID</span>
                {isLoading
                  ? <Skeleton className="h-4 w-32" />
                  : <p className="text-muted-foreground">{health?.project_id || "Not configured"}</p>}
              </div>

              <div className="space-y-1">
                <span className="font-medium">Python Version</span>
                {isLoading
                  ? <Skeleton className="h-4 w-16" />
                  : <p className="text-muted-foreground">{envInfo?.system_info?.python_version || "Unknown"}</p>}
              </div>
              <div className="space-y-1">
                <span className="font-medium">Platform</span>
                {isLoading
                  ? <Skeleton className="h-4 w-24" />
                  : <p className="text-muted-foreground">{envInfo?.system_info?.platform || "Unknown"}</p>}
              </div>
              <div className="space-y-1">
                <span className="font-medium">Hostname</span>
                {isLoading
                  ? <Skeleton className="h-4 w-20" />
                  : <p className="text-muted-foreground">{envInfo?.system_info?.hostname || "Unkwnown"}</p>}
              </div>
              <div className="space-y-1">
                <span className="font-medium">Region</span>
                {isLoading
                  ? <Skeleton className="h-4 w-16" />
                  : <p className="text-muted-foreground">{envInfo?.api_info?.region || "Unknown"}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
