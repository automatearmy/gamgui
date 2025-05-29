import { LayoutDashboard, Settings } from "lucide-react";
import * as React from "react";

import { cn, focusRing } from "@/lib/utils";

import { MobileSidebar } from "./mobile-sidebar";
import { UserProfile } from "./user-profile";

type SidebarProps = {
  className?: string;
  userProfileProps?: {
    name?: string;
    role?: string;
  };
  onNavigate?: (path: string) => void;
  currentPath?: string;
  serverVersion?: string | null; // Add serverVersion prop
};

type NavItemProps = {
  path: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: (path: string) => void;
};

function NavItem({ path, icon, children, isActive = false, onClick }: NavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(path);
    }
  };

  return (
    <a
      href={path}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        focusRing,
        isActive
          ? "bg-sidebar-accent text-sidebar-primary font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-3 text-xs font-medium uppercase text-sidebar-foreground/50">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Sidebar({
  className,
  userProfileProps = {},
  onNavigate,
  currentPath = "/",
  serverVersion, // Destructure serverVersion
}: SidebarProps) {
  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
    else {
      // Fallback to traditional navigation if onNavigate is not provided
      window.location.href = path;
    }
  };

  // Handle logout by navigating to login page
  const handleLogout = () => {
    handleNavigation("/login");
  };

  // Navigation content to be used in both desktop and mobile sidebars
  const navigationContent = (
    <>
      <NavSection title="Main">
        <NavItem
          path="/sessions"
          icon={<LayoutDashboard className="h-4 w-4" />}
          isActive={currentPath === "/" || currentPath === "/sessions"}
          onClick={handleNavigation}
        >
          Sessions
        </NavItem>
        <NavItem
          path="/settings"
          icon={<Settings className="h-4 w-4" />}
          isActive={currentPath === "/settings"}
          onClick={handleNavigation}
        >
          Settings
        </NavItem>
      </NavSection>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex",
          className,
        )}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <div className="text-lg font-semibold">GAMGUI</div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          {navigationContent}
        </div>

        <div className="mt-auto border-t border-sidebar-border p-2">
          {" "}
          {/* Added mt-auto and padding */}
          {/* Display Server Version */}
          {serverVersion && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/60 text-center truncate" title={serverVersion}>
              Server:
              {" "}
              {serverVersion === "error" ? "Error fetching" : serverVersion}
            </div>
          )}
          <UserProfile
            name={userProfileProps.name}
            role={userProfileProps.role}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <MobileSidebar
        userProfileProps={userProfileProps}
        onNavigate={onNavigate}
        currentPath={currentPath}
      >
        {navigationContent}
      </MobileSidebar>
    </>
  );
}
