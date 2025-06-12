import type { ReactNode } from "react";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
