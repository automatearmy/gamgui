import type { AuditLog } from "@/types/session";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type AuditLogsListProps = {
  logs: AuditLog[];
};

export function AuditLogsList({ logs }: AuditLogsListProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`p-3 rounded-lg border-l-4 ${
                    log.type === "command"
                      ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-l-gray-400 bg-gray-50 dark:bg-gray-900/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-medium ${
                        log.type === "command"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                      }`}
                    >
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs font-mono overflow-x-auto text-foreground leading-tight max-h-96 overflow-y-auto">
                    {log.data.trim()}
                  </pre>
                </div>
              ))}

              {logs.length === 0 && logs.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No meaningful logs to display</p>
                  <p className="text-xs mt-1">
                    All
                    {logs.length}
                    {" "}
                    log entries were filtered out as empty or control data
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
