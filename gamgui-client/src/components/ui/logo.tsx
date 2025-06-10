import { Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  textOnly?: boolean;
};

const sizeClasses = {
  sm: {
    icon: "h-4 w-4",
    text: "text-sm",
    spacing: "gap-1.5",
  },
  md: {
    icon: "h-6 w-6",
    text: "text-lg",
    spacing: "gap-2",
  },
  lg: {
    icon: "h-8 w-8",
    text: "text-2xl",
    spacing: "gap-3",
  },
  xl: {
    icon: "h-10 w-10",
    text: "text-3xl",
    spacing: "gap-4",
  },
};

export function Logo({
  className,
  size = "md",
  iconOnly = false,
  textOnly = false,
}: LogoProps) {
  const sizes = sizeClasses[size];

  if (textOnly) {
    return (
      <div className={cn("font-bold tracking-wide", sizes.text, className)}>
        <span className="text-black">GAM</span>
        <span style={{ color: "#86aef6" }}>GUI</span>
      </div>
    );
  }

  if (iconOnly) {
    return (
      <Terminal
        className={cn("text-black", sizes.icon, className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center", sizes.spacing, className)}>
      <Terminal
        className={cn("text-black", sizes.icon)}
      />
      <div className={cn("font-bold tracking-wide", sizes.text)}>
        <span className="text-black">GAM</span>
        <span style={{ color: "#86aef6" }}>GUI</span>
      </div>
    </div>
  );
}
