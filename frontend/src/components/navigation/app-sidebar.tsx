import {
  IconHelp,
  IconListDetails,
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
      url: "https://www.automatearmy.com/contact",
      icon: IconHelp,
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:items-center">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-2 group-data-[collapsible=icon]:!p-2.5 flex-1 group-data-[collapsible=icon]:flex-none"
              >
                <Link to="/" className="flex items-center justify-start group-data-[collapsible=icon]:justify-center">
                  <Logo
                    size="sm"
                    clickable
                    iconOnly={false}
                    className="group-data-[collapsible=icon]:hidden"
                  />
                  <Logo
                    size="sm"
                    clickable
                    iconOnly={true}
                    className="hidden group-data-[collapsible=icon]:block"
                  />
                </Link>
              </SidebarMenuButton>
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
                <SidebarTrigger className="size-8 shrink-0 group-data-[collapsible=icon]:size-8 flex items-center justify-center" />
              </div>
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
