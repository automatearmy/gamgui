import { User } from "lucide-react";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  src?: string;
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function UserAvatar({
  src,
  alt = "User avatar",
  className,
  size = "md",
}: UserAvatarProps) {
  return (
    <div className={cn(
      "rounded-full bg-gray-200 flex items-center justify-center overflow-hidden",
      sizeClasses[size],
      className,
    )}
    >
      {src
        ? (
            <img
              className="h-full w-full object-cover"
              src={src}
              alt={alt}
            />
          )
        : (
            <User className={cn("text-gray-600", iconSizes[size])} />
          )}
    </div>
  );
}
