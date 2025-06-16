import type { ReactNode } from "react";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import { Logo } from "@/components/ui/logo";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

function LayoutContent({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <div className="flex flex-1 flex-col min-h-screen">
          {/* Mobile Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 lg:hidden border-b bg-background">
            <SidebarTrigger className="size-8" />
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
          </header>

          <div className="@container/main flex flex-1 flex-col gap-6 p-6 lg:p-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
