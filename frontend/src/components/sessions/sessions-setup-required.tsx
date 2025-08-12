import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SessionsSetupRequired() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Settings className="size-6 text-muted-foreground" />
        </div>

        <div className="mt-6 max-w-lg">
          <h3 className="text-lg font-semibold text-foreground">
            Setup required
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Before you can create sessions, you need to configure your credentials and settings. This is a one-time setup process.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/settings">
              Configure Settings
            </Link>
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
