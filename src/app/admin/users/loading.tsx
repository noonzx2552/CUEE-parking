import { TableSkeleton } from "@/components/loading/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-64" />
      </div>
      <TableSkeleton columns={5} rows={6} />
    </div>
  );
}
