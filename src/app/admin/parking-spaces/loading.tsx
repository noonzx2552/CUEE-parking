import { TableSkeleton } from "@/components/loading/table-skeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-80" />
      </div>
      <Card className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={index === 4 ? "space-y-2 md:col-span-2" : "space-y-2"}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </Card>
      <TableSkeleton columns={5} rows={6} />
    </div>
  );
}
