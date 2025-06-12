import { SkeletonGroup } from "@/components/ui/skeleton";

export function DashboardPage() {
  // For demonstration purposes, showing skeleton loading state
  // In a real implementation, this would be based on actual loading state
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="space-y-8 py-6">
        <div className="space-y-1">
          <div className="h-8 w-48 bg-accent animate-pulse rounded-md" />
          <div className="h-4 w-96 bg-accent animate-pulse rounded-md" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonGroup variant="card" />
          <SkeletonGroup variant="card" />
          <SkeletonGroup variant="card" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonGroup variant="card" className="h-64" />
          <SkeletonGroup variant="card" className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your Google Workspace management activities.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <h2 className="text-lg font-medium mb-2">Coming Soon</h2>
        <p className="text-muted-foreground">
          Dashboard metrics and insights will be available here.
        </p>
      </div>
    </div>
  );
}
