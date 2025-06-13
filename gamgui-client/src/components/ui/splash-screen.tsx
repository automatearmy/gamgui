import { Loader2 } from "lucide-react";

import { Logo } from "./logo";

type SplashScreenProps = {
  message?: string;
};

export function SplashScreen({ message = "Loading..." }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="animate-pulse">
          <Logo size="xl" />
        </div>

        {/* Loading spinner and message */}
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#86aef7]" />
          <p className="text-sm text-muted-foreground font-medium">
            {message}
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8">
        <p className="text-xs text-muted-foreground">
          By Automate Army
        </p>
      </div>
    </div>
  );
}
