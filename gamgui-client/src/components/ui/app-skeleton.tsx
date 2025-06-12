import { Skeleton, SkeletonGroup } from "./skeleton";

// Main app loading skeleton for initial page loads
export function AppSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r bg-card p-4">
        <div className="space-y-6">
          {/* Logo area */}
          <Skeleton className="h-8 w-32" />

          {/* Navigation items */}
          <SkeletonGroup variant="list" items={4} />

          {/* User area at bottom */}
          <div className="mt-auto pt-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="space-y-8">
            {/* Page header */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Content cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SkeletonGroup variant="card" />
              <SkeletonGroup variant="card" />
              <SkeletonGroup variant="card" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Page-specific skeleton for sessions
export function SessionsPageSkeleton() {
  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`sessions-page-skeleton-row-${i}`} className="p-4">
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Settings page skeleton
export function SettingsPageSkeleton() {
  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* General section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonGroup variant="card" className="h-64" />
      </div>

      {/* Credentials section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <SkeletonGroup variant="card" />
          <SkeletonGroup variant="card" />
          <SkeletonGroup variant="card" />
        </div>
      </div>
    </div>
  );
}
