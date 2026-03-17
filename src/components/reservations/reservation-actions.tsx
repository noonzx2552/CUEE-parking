"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/web/csrf";

export function ReservationCancelButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();

  return (
    <Button
      variant="danger"
      onClick={async () => {
        const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.message ?? "Unable to cancel reservation");
          return;
        }

        toast.success("Reservation cancelled");
        router.refresh();
      }}
    >
      Cancel
    </Button>
  );
}
