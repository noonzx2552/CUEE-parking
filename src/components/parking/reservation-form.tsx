"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCsrfToken } from "@/lib/web/csrf";
import { reservationCreateSchema } from "@/lib/validators/reservation";

type FormValues = z.input<typeof reservationCreateSchema>;

export function ReservationForm({
  parkingSpaceId,
  disabled,
}: {
  parkingSpaceId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(reservationCreateSchema),
    defaultValues: {
      parkingSpaceId,
      startTime: "",
      endTime: "",
      note: "",
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify(values),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.message ?? "Unable to create reservation");
          return;
        }

        toast.success("Reservation created");
        router.push("/reservations");
        router.refresh();
      })}
    >
      <input type="hidden" {...form.register("parkingSpaceId")} value={parkingSpaceId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Start time</label>
          <Input type="datetime-local" {...form.register("startTime")} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">End time</label>
          <Input type="datetime-local" {...form.register("endTime")} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Note</label>
        <Textarea {...form.register("note")} placeholder="Vehicle details or special requests" />
      </div>
      <Button disabled={disabled || form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? "Saving..." : "Reserve this spot"}
      </Button>
    </form>
  );
}
