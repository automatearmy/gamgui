import { format } from "date-fns";
import { Calendar, Database, Server, Tag, User } from "lucide-react";
import { useState } from "react";

import type { Session } from "@/types/session";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { SessionStatus } from "./session-status";

type SessionDetailsModalProps = {
  children: React.ReactNode;
  session: Session;
};

export function SessionDetailsModal({ children, session }: SessionDetailsModalProps) {
  const [open, setOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPpp");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Session Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about this session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Session Name</h3>
                <p className="text-sm text-muted-foreground">{session.name}</p>
              </div>
              <SessionStatus status={session.status} />
            </div>

            {session.description && (
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Description</h3>
                <p className="text-sm text-muted-foreground">{session.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Technical Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Server className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Pod Information</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Name:</span>
                    <Badge variant="secondary" className="text-xs">
                      {session.pod_name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Namespace:</span>
                    <Badge variant="outline" className="text-xs">
                      {session.pod_namespace}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Database className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Session ID</h3>
                <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {session.id}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="font-medium text-sm">User ID</h3>
                <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {session.user_id}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">Created</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(session.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">Last Updated</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
