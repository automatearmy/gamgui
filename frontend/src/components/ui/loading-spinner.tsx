import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  fullPage?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
};

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function LoadingSpinner({
  className,
  fullPage = false,
  size = "md",
  message,
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <Loader2 className={cn(
      "animate-spin text-[#86aef7]",
      sizeClasses[size],
      className,
    )}
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          {spinnerElement}
          {message && (
            <p className="text-sm text-muted-foreground font-medium">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex items-center gap-3">
        {spinnerElement}
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  return spinnerElement;
}
