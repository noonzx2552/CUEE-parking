import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-20" />
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200 p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
        ))}
      </Card>
    </div>
  );
}
