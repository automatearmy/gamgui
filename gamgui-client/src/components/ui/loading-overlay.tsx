import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingOverlayProps = {
  isVisible: boolean;
  message?: string;
  className?: string;
};

export function LoadingOverlay({
  isVisible,
  message = "Loading...",
  className,
}: LoadingOverlayProps) {
  if (!isVisible)
    return null;

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50",
      className,
    )}
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-card border shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-[#86aef7]" />
        <p className="text-sm text-muted-foreground font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}
