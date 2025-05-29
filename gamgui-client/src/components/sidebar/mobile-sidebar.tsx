import { Menu, X } from "lucide-react";
import * as React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn, focusRing } from "@/lib/utils";

import { UserProfile } from "./user-profile";

type MobileSidebarProps = {
  children: React.ReactNode;
  userProfileProps?: {
    name?: string;
    role?: string;
  };
  onNavigate?: (path: string) => void;
  currentPath?: string;
};

export function MobileSidebar({
  children,
  userProfileProps = {},
  onNavigate,
  currentPath: _currentPath,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle logout by navigating to login page
  const handleLogout = () => {
    setIsOpen(false); // Close the sidebar
    if (onNavigate) {
      onNavigate("/login");
    }
    else {
      // Fallback to traditional navigation if onNavigate is not provided
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <div className="text-lg font-semibold">GAMGUI</div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className={cn("text-sidebar-foreground", focusRing)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-3/4 max-w-xs transform bg-sidebar p-4 shadow-lg transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">GAMGUI</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className={cn("text-sidebar-foreground", focusRing)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {children}
        </div>

        <div className="mt-auto pt-6">
          <UserProfile
            name={userProfileProps.name}
            role={userProfileProps.role}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </>
  );
}
