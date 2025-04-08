import React from "react";
import { Button } from "@/components/ui/button";
import { SessionsTable, type Session } from "@/components/sessions/SessionsTable";
import { Plus } from "lucide-react";

// Mock data for sessions
const mockSessions: Session[] = [
  {
    id: "1",
    label: "Session 1 as MVP",
    user: "Bruno",
    date: "1/12/2024",
    isHighlighted: true,
  },
  {
    id: "2",
    label: "Google Workspace Audit",
    user: "Bruno",
    date: "1/12/2024",
  },
  {
    id: "3",
    label: "User Management Batch",
    user: "Bruno",
    date: "1/12/2024",
  },
  {
    id: "4",
    label: "License Assignment",
    user: "Bruno",
    date: "1/12/2024",
  },
  {
    id: "5",
    label: "Group Membership Update",
    user: "Bruno",
    date: "1/12/2024",
  },
];

export function SessionsPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const handleNewSession = () => {
    if (onNavigate) {
      onNavigate("/sessions/new");
    } else {
      // Fallback for direct navigation
      window.location.href = "/sessions/new";
    }
  };

  const handleViewSession = (sessionId: string) => {
    console.log(`View session: ${sessionId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Button onClick={handleNewSession} className="shrink-0">
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Sessions Table */}
      <SessionsTable sessions={mockSessions} onViewSession={handleViewSession} />
    </div>
  );
}
