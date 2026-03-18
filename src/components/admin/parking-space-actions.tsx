"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/web/csrf";

export function ParkingSpaceActions({
  parkingSpaceId,
  parkingCode,
}: {
  parkingSpaceId: string;
  parkingCode: string;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        onClick={async () => {
          const confirmed = window.confirm(`Delete parking space ${parkingCode}?`);
          if (!confirmed) return;

          const response = await fetch(`/api/admin/parking-spaces/${parkingSpaceId}`, {
            method: "DELETE",
            headers: {
              "x-csrf-token": getCsrfToken(),
            },
          });

          const data = await response.json();
          if (!response.ok) {
            toast.error(data.message ?? "Unable to delete parking space");
            return;
          }

          toast.success("Parking space deleted");
          router.refresh();
        }}
      >
        Delete
      </Button>
    </div>
  );
}
