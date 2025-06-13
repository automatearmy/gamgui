import type { ReactNode } from "react";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

function LayoutContent({ children }: { children: ReactNode }) {
  const { state } = useSidebar();
  const sidebarOpen = state === "expanded";

  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className={`@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6 ${!sidebarOpen ? "pt-4 pb-4" : "py-4"}`}>
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
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
