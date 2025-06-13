import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "./logo";

type AnimatedSplashScreenProps = {
  message?: string;
  onComplete?: () => void;
};

export function AnimatedSplashScreen({
  message = "Loading...",
  onComplete,
}: AnimatedSplashScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTypewriter, setShowTypewriter] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(1), 500);
    const timer2 = setTimeout(() => setCurrentStep(2), 1500);
    const timer3 = setTimeout(() => setShowTypewriter(true), 2500);
    const timer4 = setTimeout(() => setCurrentStep(3), 4000);

    // Auto complete after 8 seconds if no onComplete provided
    const autoComplete = setTimeout(() => {
      if (onComplete)
        onComplete();
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(autoComplete);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[99999] overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#86aef7]/30 rounded-full animate-pulse"
          style={{ animationDelay: "0s", animationDuration: "2s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-1 h-1 bg-[#86aef7]/40 rounded-full animate-pulse"
          style={{ animationDelay: "0.5s", animationDuration: "1.5s" }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-[#86aef7]/20 rounded-full animate-pulse"
          style={{ animationDelay: "1s", animationDuration: "2.5s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-[#86aef7]/35 rounded-full animate-pulse"
          style={{ animationDelay: "1.5s", animationDuration: "1.8s" }}
        />
      </div>

      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* Animated Logo */}
        <div className={`transition-all duration-1000 ${
          currentStep >= 1
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-75 translate-y-4"
        }`}
        >
          <div className={`${currentStep >= 2 ? "animate-pulse" : ""}`}>
            <Logo size="xl" />
          </div>
        </div>

        {/* Loading Animation */}
        <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${
          currentStep >= 2 ? "opacity-100" : "opacity-0"
        }`}
        >
          {/* Custom animated spinner */}
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-[#86aef7]" />
            <div
              className="absolute inset-0 h-8 w-8 border-2 border-transparent border-t-[#86aef7]/30 rounded-full animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
            />
          </div>

          {/* Typewriter effect message */}
          <div className="h-6 flex items-center">
            {showTypewriter && (
              <p className="text-sm text-muted-foreground font-medium transition-all duration-1000 opacity-100 animate-pulse">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Loading dots */}
        <div className={`flex gap-2 transition-all duration-500 ${
          currentStep >= 3 ? "opacity-100" : "opacity-0"
        }`}
        >
          <div
            className="w-2 h-2 bg-[#86aef7] rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="w-2 h-2 bg-[#86aef7] rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-[#86aef7] rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>

      {/* Bottom branding with fade in */}
      <div className={`absolute bottom-8 transition-all duration-1000 ${
        currentStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      >
        <p className="text-xs text-muted-foreground">
          By Automate Army
        </p>
      </div>
    </div>
  );
}
