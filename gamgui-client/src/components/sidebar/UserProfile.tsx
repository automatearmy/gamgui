import React from "react";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  name: string;
  role: string;
  className?: string;
}

export function UserProfile({ name, role, className }: UserProfileProps) {
  // Extract initials from name (first letter of first and last name)
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
        {initials}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-sidebar-foreground/70">{role}</span>
      </div>
    </div>
  );
}
