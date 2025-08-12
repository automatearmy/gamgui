import { formatDistanceToNow } from "date-fns";
import { EllipsisVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import type { Session } from "@/types/session";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEndSession } from "@/hooks/use-sessions";

import { Button } from "../ui/button";
import { SessionDetailsModal } from "./session-details-modal";
import { SessionStatus } from "./session-status";
import { SessionsEmptyState } from "./sessions-empty-state";

type SessionsListProps = {
  sessions: Session[];
  onSessionCreate: () => void;
};

export function SessionsList({ sessions, onSessionCreate }: SessionsListProps) {
  const endSessionMutation = useEndSession();

  const handleEndSession = (sessionId: string) => {
    toast.promise(
      endSessionMutation.mutateAsync(sessionId),
      {
        loading: "Ending session...",
        success: "Session ended successfully",
        error: "Failed to end session",
      },
    );
  };

  const canEndSession = (status: string) => {
    return status === "Running" || status === "Pending";
  };

  if (sessions.length === 0) {
    return <SessionsEmptyState onSessionCreate={onSessionCreate} />;
  }

  return (
    <ul role="list" className="divide-y">
      {sessions.map(session => (
        <li key={session.id} className="flex items-center justify-between gap-x-6 py-5">
          <div className="min-w-0">
            <div className="flex gap-x-3 items-center">
              <p className="text-sm/6 font-semibold text-foreground">{session.name}</p>

              <SessionStatus status={session.status} className="text-sm/6" />
            </div>
            <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-muted-foreground">
              <p className="whitespace-nowrap">
                Created
                {" "}
                <time dateTime={session.created_at}>
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </time>
              </p>
              {session.description && (
                <>
                  <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                    <circle r={1} cx={1} cy={1} />
                  </svg>
                  <p className="truncate">
                    {session.description}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-none items-center gap-x-2.5">
            {session.status === "Running"
              ? (
                  <Button asChild variant="outline">
                    <Link to={`/sessions/${session.id}/connect`}>
                      Connect
                    </Link>
                  </Button>
                )
              : session.status === "Succeeded"
                ? (
                    <Button asChild variant="outline">
                      <Link to={`/sessions/${session.id}/logs`}>
                        Logs
                      </Link>
                    </Button>
                  )
                : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>
                  Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <SessionDetailsModal session={session}>
                  <DropdownMenuItem onSelect={e => e.preventDefault()}>
                    Details
                  </DropdownMenuItem>
                </SessionDetailsModal>
                <DropdownMenuItem
                  disabled={!canEndSession(session.status) || endSessionMutation.isPending}
                  onSelect={() => handleEndSession(session.id)}
                >
                  {endSessionMutation.isPending ? "Ending..." : "End Session"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      ))}
    </ul>
  );
}
