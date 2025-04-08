import React from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  className?: string;
  initials?: string;
}

export function UserAvatar({ className, initials = "B" }: UserAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[10px] font-medium text-white",
        className
      )}
      aria-label="User avatar"
    >
      {initials}
    </div>
  );
}
