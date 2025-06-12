import { Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  textOnly?: boolean;
  clickable?: boolean;
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
  clickable = false,
}: LogoProps) {
  const sizes = sizeClasses[size];

  const hoverClasses = clickable
    ? "cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-sm"
    : "";

  if (textOnly) {
    return (
      <div
        className={cn(
          "font-bold tracking-wide",
          sizes.text,
          hoverClasses,
          className,
        )}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? "Navigate to dashboard" : undefined}
      >
        <span className="text-black">GAM</span>
        <span style={{ color: "#86aef6" }}>GUI</span>
      </div>
    );
  }

  if (iconOnly) {
    return (
      <Terminal
        className={cn(
          "text-black",
          sizes.icon,
          hoverClasses,
          className,
        )}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? "Navigate to dashboard" : undefined}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center",
        sizes.spacing,
        hoverClasses,
        className,
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? "Navigate to dashboard" : undefined}
    >
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
