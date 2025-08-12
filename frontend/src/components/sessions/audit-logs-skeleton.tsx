import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function AuditLogsSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={`audit-skeleton-${i}`} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
