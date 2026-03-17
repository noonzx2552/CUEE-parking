"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/web/csrf";
import { profileSchema } from "@/lib/validators/auth";

export function ProfileForm({
  initialValues,
}: {
  initialValues: z.input<typeof profileSchema>;
}) {
  const router = useRouter();
  const form = useForm<z.input<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify(values),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.message ?? "Unable to save profile");
          return;
        }

        toast.success("Profile updated");
        router.refresh();
      })}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Display name</label>
        <Input {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">LINE user ID</label>
        <Input {...form.register("lineUserId")} placeholder="Optional, for direct push messages" />
        <p className="text-xs text-zinc-500">You can bind manually now, or use the webhook flow documented in README.</p>
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Save profile
      </Button>
    </form>
  );
}
