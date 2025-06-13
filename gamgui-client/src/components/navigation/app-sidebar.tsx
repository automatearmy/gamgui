import {
  IconHelp,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";

import { NavMain } from "@/components/navigation/nav-main";
import { NavSecondary } from "@/components/navigation/nav-secondary";
import { NavUser } from "@/components/navigation/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

import { Logo } from "../ui/logo";

const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Sessions",
      url: "/",
      icon: IconListDetails,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "https://github.com/automatearmy/gamgui-app",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "https://github.com/automatearmy/gamgui-app",
      icon: IconSearch,
    },
  ],
  userRoutes: [
    {
      label: "Account",
      href: "/account",
      icon: IconUserCircle,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: IconSettings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5 flex-1"
              >
                <Link to="/">
                  <Logo clickable />
                </Link>
              </SidebarMenuButton>
              <SidebarTrigger className="size-8 shrink-0" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} routes={data.userRoutes} />
      </SidebarFooter>
    </Sidebar>
  );
}
