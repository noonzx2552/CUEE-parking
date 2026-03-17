"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";
import { getCsrfToken } from "@/lib/web/csrf";

export function LogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const text = t(locale);

  return (
    <Button
      variant="ghost"
      onClick={async () => {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
        });

        if (!response.ok) {
          toast.error("Unable to sign out");
          return;
        }

        router.push("/login");
        router.refresh();
      }}
    >
      {text.nav.logout}
    </Button>
  );
}
