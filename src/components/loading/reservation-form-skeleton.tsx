import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReservationFormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-80" />
      </div>

      <Card className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-72" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-zinc-200 p-4">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="mt-2 h-4 w-16" />
                <Skeleton className="mt-4 h-5 w-28" />
              </div>
            ))}
          </div>
        </div>

        <Card className="space-y-5 border-zinc-200/80 p-5 shadow-none">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-zinc-200 p-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="mt-2 h-4 w-16" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-zinc-200 p-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-3 h-11 w-full" />
                <Skeleton className="mt-3 h-8 w-32" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-zinc-200 p-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-2 h-6 w-24" />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-28 w-full" />
        </div>

        <Skeleton className="h-11 w-44" />
      </Card>
    </div>
  );
}
