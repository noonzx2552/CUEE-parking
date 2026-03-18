"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
  lineAddFriendUrl,
}: {
  initialValues: z.input<typeof profileSchema>;
  lineAddFriendUrl?: string;
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

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">LINE notifications</p>
        <p className="mt-1 text-sm text-emerald-800">
          เพิ่มเพื่อน LINE ของระบบก่อน แล้วค่อย bind LINE user ID เพื่อรับการแจ้งเตือนอัตโนมัติ
        </p>
        {lineAddFriendUrl ? (
          <div className="mt-3">
            <Link href={lineAddFriendUrl} target="_blank" rel="noreferrer">
              <Button type="button">Add LINE Friend</Button>
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-xs text-emerald-800">ยังไม่ได้ตั้งค่า `LINE_ADD_FRIEND_URL` ใน environment</p>
        )}
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
