"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCsrfToken } from "@/lib/web/csrf";
import { parkingSpaceSchema } from "@/lib/validators/parking";

type FormValues = z.input<typeof parkingSpaceSchema>;

export function ParkingForm({
  initialValues,
  parkingSpaceId,
}: {
  initialValues?: FormValues;
  parkingSpaceId?: string;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(parkingSpaceSchema),
    defaultValues: initialValues ?? {
      code: "",
      zone: "",
      type: "normal",
      status: "available",
      description: "",
    },
  });

  const method = parkingSpaceId ? "PATCH" : "POST";
  const endpoint = parkingSpaceId
    ? `/api/admin/parking-spaces/${parkingSpaceId}`
    : "/api/admin/parking-spaces";

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify(values),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.message ?? "Unable to save parking space");
          return;
        }

        toast.success(parkingSpaceId ? "Parking space updated" : "Parking space created");
        router.refresh();
      })}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Code</label>
        <Input {...form.register("code")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Zone</label>
        <Input {...form.register("zone")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Type</label>
        <Select {...form.register("type")}>
          <option value="normal">Normal</option>
          <option value="ev">EV</option>
          <option value="disabled">Disabled</option>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Status</label>
        <Select {...form.register("status")}>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-zinc-700">Description</label>
        <Textarea {...form.register("description")} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save parking space
        </Button>
      </div>
    </form>
  );
}
