import { cn } from "@/lib/utils";

type AnimatedSkeletonProps = {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showHeader?: boolean;
  variant?: "default" | "shimmer" | "wave";
};

export function AnimatedSkeleton({
  className,
  lines = 3,
  showAvatar = false,
  showHeader = false,
  variant = "shimmer",
}: AnimatedSkeletonProps) {
  const getAnimationClass = () => {
    switch (variant) {
      case "shimmer":
        return "animate-shimmer";
      case "wave":
        return "animate-wave";
      default:
        return "animate-pulse";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center space-x-4">
          {showAvatar && (
            <div className={cn(
              "h-12 w-12 rounded-full bg-muted",
              getAnimationClass(),
            )}
            />
          )}
          <div className="space-y-2 flex-1">
            <div className={cn(
              "h-4 bg-muted rounded w-1/4 animate-stagger-1",
              getAnimationClass(),
            )}
            />
            <div className={cn(
              "h-3 bg-muted rounded w-1/6 animate-stagger-2",
              getAnimationClass(),
            )}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-4 bg-muted rounded",
              index === lines - 1 ? "w-3/4" : "w-full",
              getAnimationClass(),
              `animate-stagger-${Math.min(index + 1, 5)}`,
            )}
          />
        ))}
      </div>
    </div>
  );
}

type AnimatedTableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
  variant?: "default" | "shimmer" | "wave";
};

export function AnimatedTableSkeleton({
  rows = 5,
  columns = 4,
  className,
  variant = "shimmer",
}: AnimatedTableSkeletonProps) {
  const getAnimationClass = () => {
    switch (variant) {
      case "shimmer":
        return "animate-shimmer";
      case "wave":
        return "animate-wave";
      default:
        return "animate-pulse";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-4 bg-muted rounded flex-1",
              getAnimationClass(),
              `animate-stagger-${Math.min(index + 1, 5)}`,
            )}
          />
        ))}
      </div>

      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  "h-4 bg-muted rounded flex-1",
                  getAnimationClass(),
                  `animate-stagger-${Math.min((rowIndex * columns + colIndex) % 5 + 1, 5)}`,
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type AnimatedCardSkeletonProps = {
  className?: string;
  showImage?: boolean;
  variant?: "default" | "shimmer" | "wave";
};

export function AnimatedCardSkeleton({
  className,
  showImage = false,
  variant = "shimmer",
}: AnimatedCardSkeletonProps) {
  const getAnimationClass = () => {
    switch (variant) {
      case "shimmer":
        return "animate-shimmer";
      case "wave":
        return "animate-wave";
      default:
        return "animate-pulse";
    }
  };

  return (
    <div className={cn("p-6 border rounded-lg space-y-4 animate-fadeInUp", className)}>
      {showImage && (
        <div className={cn(
          "h-48 bg-muted rounded animate-stagger-1",
          getAnimationClass(),
        )}
        />
      )}

      <div className="space-y-3">
        <div className={cn(
          "h-6 bg-muted rounded w-3/4 animate-stagger-2",
          getAnimationClass(),
        )}
        />
        <div className={cn(
          "h-4 bg-muted rounded w-full animate-stagger-3",
          getAnimationClass(),
        )}
        />
        <div className={cn(
          "h-4 bg-muted rounded w-5/6 animate-stagger-4",
          getAnimationClass(),
        )}
        />
      </div>

      <div className="flex space-x-2">
        <div className={cn(
          "h-8 bg-muted rounded w-20 animate-stagger-4",
          getAnimationClass(),
        )}
        />
        <div className={cn(
          "h-8 bg-muted rounded w-16 animate-stagger-5",
          getAnimationClass(),
        )}
        />
      </div>
    </div>
  );
}
