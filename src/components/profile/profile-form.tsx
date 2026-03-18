"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSchema } from "@/lib/validators/auth";
import { getCsrfToken } from "@/lib/web/csrf";

export function ProfileForm({
  initialValues,
  hasLineConnection,
}: {
  initialValues: z.input<typeof profileSchema>;
  hasLineConnection?: boolean;
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
          body: JSON.stringify({
            name: values.name,
            lineUserId: values.lineUserId ?? initialValues.lineUserId ?? "",
          }),
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
      <input type="hidden" {...form.register("lineUserId")} />

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Display name</label>
        <Input {...form.register("name")} />
      </div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
        <p className="text-sm font-semibold text-sky-950">เชื่อมต่อ LINE กับระบบ</p>
        <p className="mt-1 text-sm text-sky-900/80">
          {hasLineConnection
            ? "LINE ของคุณเชื่อมกับระบบแล้ว สามารถเข้าไปจัดการการเชื่อมต่อได้จากหน้าถัดไป"
            : "กดเข้าไปที่หน้าเชื่อม LINE เพื่อเปิด LINE และเชื่อมบัญชีกับระบบแจ้งเตือน"}
        </p>
        <div className="mt-4">
          <Link href="/line/connect">
            <Button type="button">{hasLineConnection ? "จัดการการเชื่อมต่อ LINE" : "ไปหน้าเชื่อม LINE"}</Button>
          </Link>
        </div>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        Save profile
      </Button>
    </form>
  );
}
