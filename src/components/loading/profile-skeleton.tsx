import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-64" />
      </div>

      <Card className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>

        <div className="rounded-2xl border border-zinc-200 p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-80" />
          <Skeleton className="mt-4 h-11 w-40" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-4 w-72" />
        </div>

        <Skeleton className="h-11 w-36" />
      </Card>
    </div>
  );
}
