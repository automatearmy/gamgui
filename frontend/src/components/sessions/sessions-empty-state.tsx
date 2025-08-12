import { Plus, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SessionsEmptyStateProps = {
  onSessionCreate: () => void;
};

export function SessionsEmptyState({ onSessionCreate }: SessionsEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Terminal className="size-6 text-muted-foreground" />
        </div>

        <div className="mt-6 max-w-md">
          <h3 className="text-lg font-semibold text-foreground">
            Start a new session
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating your first GAM session. You can manage and connect to multiple sessions from here.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={onSessionCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Session
          </Button>
          <Button variant="outline" asChild>
            <a target="_blank" rel="noreferrer noopener" href="https://github.com/automatearmy/gamgui">
              Learn more
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
