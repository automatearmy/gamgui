import {
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useParams } from "react-router-dom";

import { AuditLogsEmptyState } from "@/components/sessions/audit-logs-empty-state";
import { AuditLogsList } from "@/components/sessions/audit-logs-list";
import { AuditLogsSkeleton } from "@/components/sessions/audit-logs-skeleton";
import { SessionStatus } from "@/components/sessions/session-status";
import { Button } from "@/components/ui/button";
import { useSession, useSessionAuditLogs } from "@/hooks/use-sessions";

export function SessionLogsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading: isSessionLoading } = useSession(id!);
  const { data: auditLogs, isLoading: isLogsLoading, refetch } = useSessionAuditLogs(id!);

  const handleRefresh = () => {
    refetch();
  };

  const handleDownloadLogs = () => {
    if (auditLogs && auditLogs.length > 0) {
      const logText = auditLogs
        .map(log => `[${new Date(log.timestamp).toLocaleString()}] ${log.type.toUpperCase()}: ${log.data}`)
        .join("\n");

      const blob = new Blob([logText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${id}-audit-logs.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isSessionLoading) {
    return "Loading...";
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header Section */}
      <div className="lg:flex lg:items-center lg:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {`Session ${session.name} - Audit Logs`}
          </h1>
          <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="flex items-center">
              <SessionStatus status={session.status} />
            </div>
            <div className="flex items-center">
              <FileText className="mr-1 h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {auditLogs?.length || 0}
                {" "}
                entries
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 lg:ml-4 lg:mt-0">
          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLogsLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isLogsLoading ? "Loading..." : "Refresh"}
          </Button>

          {/* Download Logs Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={!auditLogs || auditLogs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Logs
          </Button>
        </div>
      </div>

      {/* Logs Section */}
      <div className="flex-1 min-h-0">
        {isLogsLoading
          ? (
              <AuditLogsSkeleton />
            )
          : auditLogs && auditLogs.length > 0
            ? (
                <AuditLogsList logs={auditLogs} />
              )
            : (
                <AuditLogsEmptyState />
              )}
      </div>
    </div>
  );
}
