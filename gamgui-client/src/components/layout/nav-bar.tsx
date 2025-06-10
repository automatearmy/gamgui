import { Home, ListTodo, LogOut, Plus, Settings, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/hooks/use-auth";

// Navigation links
const navigationLinks = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Sessions", href: "/sessions", icon: ListTodo },
  { name: "New Session", href: "/sessions/new", icon: Plus },
];

// User dropdown menu items
const userMenuItems = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function NavBar() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 h-16">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <nav className="hidden md:flex space-x-1">
            {navigationLinks.map(link => (
              <Button key={link.name} variant="ghost" asChild>
                <Link to={link.href} className="flex items-center space-x-2">
                  <link.icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <UserAvatar
                  src={user.picture}
                  alt={`Profile of ${user.display_name || user.email}`}
                  size="md"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.display_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              {userMenuItems.map(item => (
                <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
