import { Skeleton } from "@/components/ui/skeleton";

export function SessionsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={`session-skeleton-${i}`} className="flex items-center justify-between gap-x-6 py-5 border-b">
          <div className="min-w-0 flex-1">
            <div className="flex gap-x-3 items-center mb-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-x-2">
              <Skeleton className="h-4 w-32" />
              <div className="w-1 h-1 bg-muted rounded-full" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex flex-none items-center gap-x-2.5">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}
