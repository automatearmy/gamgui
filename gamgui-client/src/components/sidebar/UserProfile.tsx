import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authContext";
import { LogOut } from "lucide-react";

interface UserProfileProps {
  name?: string;
  role?: string;
  className?: string;
  onLogout?: () => void;
}

export function UserProfile({ name, role, className, onLogout }: UserProfileProps) {
  const { user, logout } = useAuth();
  
  // Use authenticated user info if available, otherwise use props
  const displayName = user?.name || name || "User";
  const displayRole = role || (user?.domain ? `@${user.domain}` : "User");
  
  // Extract initials from name (first letter of first and last name)
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
    
  // Handle logout
  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    }
  };
  
  // Use user's profile picture if available
  const hasProfilePicture = !!user?.picture;

  return (
    <div className={cn("flex items-center justify-between p-3", className)}>
      <div className="flex items-center gap-3">
        {hasProfilePicture ? (
          <img 
            src={user?.picture} 
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            {initials}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium truncate max-w-[120px]" title={displayName}>
            {displayName}
          </span>
          <span className="text-xs text-sidebar-foreground/70 truncate max-w-[120px]" title={displayRole}>
            {displayRole}
          </span>
        </div>
      </div>
      
      {/* Logout button */}
      <button 
        onClick={handleLogout}
        className="p-2 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
