import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthSkeleton() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </Card>
    </div>
  );
}
