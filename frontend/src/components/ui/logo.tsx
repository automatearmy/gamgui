import gamguiLogoDark from "@/assets/logos/gamgui-logo-dark.svg";
import gamguiIconDark from "@/assets/logos/gamgui-logo-only-icon-dark.svg";
import gamguiIconWhite from "@/assets/logos/gamgui-logo-only-icon-white.svg";
import gamguiLogoWhite from "@/assets/logos/gamgui-logo-white.svg";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "icon" | "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  clickable?: boolean;
};

const sizeClasses = {
  icon: "h-4 w-4", // Square for icon-only
  sm: "h-6 w-auto", // Small logo
  md: "h-8 w-auto", // Medium logo
  lg: "h-10 w-auto", // Large logo
  xl: "h-12 w-auto", // Extra large logo
};

export function Logo({
  className,
  size = "md",
  iconOnly = false,
  clickable = false,
}: LogoProps) {
  const { theme } = useTheme();
  const sizeClass = sizeClasses[size];

  const hoverClasses = clickable
    ? "cursor-pointer transition-all duration-200 hover:opacity-80 hover:drop-shadow-sm"
    : "";

  // Choose logo based on theme: white logo for dark theme, dark logo for light theme
  const fullLogoSrc = theme === "dark" ? gamguiLogoWhite : gamguiLogoDark;
  const iconSrc = theme === "dark" ? gamguiIconWhite : gamguiIconDark;

  if (iconOnly) {
    return (
      <img
        src={iconSrc}
        alt="GAMGUI Logo"
        className={cn(
          "shrink-0",
          sizeClass,
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
    <img
      src={fullLogoSrc}
      alt="GAMGUI Logo"
      className={cn(
        "shrink-0",
        sizeClass,
        hoverClasses,
        className,
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? "Navigate to dashboard" : undefined}
    />
  );
}
