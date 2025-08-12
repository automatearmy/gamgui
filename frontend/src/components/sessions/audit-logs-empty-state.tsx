import { FileText, History } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function AuditLogsEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <History className="size-6 text-muted-foreground" />
        </div>

        <div className="mt-6 max-w-md">
          <h3 className="text-lg font-semibold text-foreground">
            No audit logs yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Commands and outputs will appear here once you start using the terminal session.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Logs are captured automatically for security and audit purposes</span>
        </div>
      </CardContent>
    </Card>
  );
}
