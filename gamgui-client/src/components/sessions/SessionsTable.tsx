import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

export interface Session {
  id: string;
  label: string;
  user: string;
  date: string;
  isHighlighted?: boolean;
}

interface SessionsTableProps {
  sessions: Session[];
  onViewSession: (sessionId: string) => void;
}

export function SessionsTable({ sessions, onViewSession }: SessionsTableProps) {
  return (
    <div className="w-full overflow-auto rounded-md border border-border">
      <table className="w-full min-w-full table-auto">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Label
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              User
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Date
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <tr
              key={session.id}
              className={`${
                index % 2 === 0 ? "bg-background" : "bg-muted/20"
              } ${
                session.isHighlighted
                  ? "bg-primary/5 hover:bg-primary/10"
                  : "hover:bg-muted/30"
              } transition-colors`}
            >
              <td className="px-4 py-3 text-sm">
                <span className={session.isHighlighted ? "font-medium" : ""}>
                  {session.label}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <UserAvatar />
                  <span>{session.user}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{session.date}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  onClick={() => onViewSession(session.id)}
                >
                  View Session
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
