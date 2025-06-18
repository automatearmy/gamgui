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
    svg: "h-4 w-auto",
    text: "text-sm",
    spacing: "gap-1.5",
  },
  md: {
    svg: "h-6 w-auto",
    text: "text-lg",
    spacing: "gap-2",
  },
  lg: {
    svg: "h-8 w-auto",
    text: "text-2xl",
    spacing: "gap-3",
  },
  xl: {
    svg: "h-10 w-auto",
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
    // Show the custom logo icon for collapsed sidebar
    return (
      <img
        src="/logo-icon-only.svg"
        alt="GAMGUI Icon"
        className={cn(
          "shrink-0 object-contain",
          sizes.svg,
          hoverClasses,
          className,
        )}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? "Navigate to dashboard" : "GAMGUI Logo"}
      />
    );
  }

  // Full logo for expanded sidebar and login page
  return (
    <img
      src="/gamgui-logo.svg"
      alt="GAMGUI Logo"
      className={cn(
        "shrink-0 object-contain",
        sizes.svg,
        hoverClasses,
        className,
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? "Navigate to dashboard" : "GAMGUI Logo"}
    />
  );
}
