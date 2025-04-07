import React from "react";
import { cn, focusRing } from "@/lib/utils";
import { UserProfile } from "./UserProfile";
import { MobileSidebar } from "./MobileSidebar";
import { Settings, LayoutDashboard } from "lucide-react";

interface SidebarProps {
  className?: string;
  userProfileProps: {
    name: string;
    role: string;
  };
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
}

function NavItem({ href, icon, children, isActive = false }: NavItemProps) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        focusRing,
        isActive
          ? "bg-sidebar-accent text-sidebar-primary font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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

export function Sidebar({ className, userProfileProps }: SidebarProps) {
  // Navigation content to be used in both desktop and mobile sidebars
  const navigationContent = (
    <>
      <NavSection title="Main">
        <NavItem href="/sessions" icon={<LayoutDashboard className="h-4 w-4" />} isActive>
          Sessions
        </NavItem>
        <NavItem href="/settings" icon={<Settings className="h-4 w-4" />}>
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
          className
        )}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <div className="text-lg font-semibold">GAMGUI</div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          {navigationContent}
        </div>

        <div className="border-t border-sidebar-border">
          <UserProfile
            name={userProfileProps.name}
            role={userProfileProps.role}
          />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <MobileSidebar userProfileProps={userProfileProps}>
        {navigationContent}
      </MobileSidebar>
    </>
  );
}
