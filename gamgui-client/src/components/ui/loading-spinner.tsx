import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  fullPage?: boolean;
};

export function LoadingSpinner({ className, fullPage = false }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <Loader2 className="h-12 w-12 animate-spin text-[#86aef7]" />
      </div>
    );
  }

  return <Loader2 className={cn("animate-spin text-[#86aef7]", className)} />;
}
