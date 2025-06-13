import { cn } from "@/lib/utils";

type ContentSkeletonProps = {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showHeader?: boolean;
};

export function ContentSkeleton({
  className,
  lines = 3,
  showAvatar = false,
  showHeader = false,
}: ContentSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center space-x-4">
          {showAvatar && (
            <div className="h-12 w-12 rounded-full bg-muted" />
          )}
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/6" />
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
            )}
          />
        ))}
      </div>
    </div>
  );
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {/* Table header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-4 bg-muted rounded flex-1" />
        ))}
      </div>

      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-muted rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type CardSkeletonProps = {
  className?: string;
  showImage?: boolean;
};

export function CardSkeleton({ className, showImage = false }: CardSkeletonProps) {
  return (
    <div className={cn("animate-pulse p-6 border rounded-lg space-y-4", className)}>
      {showImage && (
        <div className="h-48 bg-muted rounded" />
      )}

      <div className="space-y-3">
        <div className="h-6 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>

      <div className="flex space-x-2">
        <div className="h-8 bg-muted rounded w-20" />
        <div className="h-8 bg-muted rounded w-16" />
      </div>
    </div>
  );
}
