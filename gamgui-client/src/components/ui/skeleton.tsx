import { cn } from "@/lib/utils";

// Base skeleton component
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

// Variant-based skeleton system for better maintainability
type SkeletonVariant = "card" | "table" | "list" | "form";

type SkeletonGroupProps = {
  variant: SkeletonVariant;
  className?: string;
  // Table-specific props
  rows?: number;
  columns?: number;
  // List-specific props
  items?: number;
};

function SkeletonGroup({ variant, className, rows = 3, columns = 5, items = 3 }: SkeletonGroupProps) {
  switch (variant) {
    case "table":
      return (
        <div className={cn("rounded-lg border bg-card", className)}>
          <div className="border-b p-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }, (_, i) => (
                <Skeleton key={`table-header-col-${i}`} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: rows }, (_, i) => (
              <div key={`table-row-${i}`} className="p-4">
                <div className="flex space-x-4">
                  {Array.from({ length: columns }, (_, j) => (
                    <Skeleton key={`table-cell-${i}-${j}`} className="h-4 flex-1" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "card":
      return (
        <div className={cn("rounded-lg border bg-card p-6", className)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-3", className)}>
          {Array.from({ length: items }, (_, i) => (
            <div key={`skeleton-list-item-${i}`} className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );

    case "form":
      return (
        <div className={cn("space-y-6", className)}>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      );

    default:
      return <Skeleton className={className} />;
  }
}

// Legacy components for backward compatibility (deprecated)
/** @deprecated Use SkeletonGroup with variant="card" instead */
function CardSkeleton({ className }: { className?: string }) {
  return <SkeletonGroup variant="card" className={className} />;
}

/** @deprecated Use SkeletonGroup with variant="table" instead */
function TableSkeleton({ rows = 3, columns = 5 }: { rows?: number; columns?: number }) {
  return <SkeletonGroup variant="table" rows={rows} columns={columns} />;
}

/** @deprecated Use SkeletonGroup with variant="list" instead */
function ListSkeleton({ items = 3 }: { items?: number }) {
  return <SkeletonGroup variant="list" items={items} />;
}

/** @deprecated Use SkeletonGroup with variant="form" instead */
function FormSkeleton() {
  return <SkeletonGroup variant="form" />;
}

export {
  CardSkeleton,
  FormSkeleton,
  ListSkeleton,
  Skeleton,
  SkeletonGroup,
  TableSkeleton,
};
