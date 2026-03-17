import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function LoginPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const text = t(locale);
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-950">{text.auth.loginTitle}</h1>
          <p className="text-sm text-zinc-500">{text.auth.loginSubtitle}</p>
        </div>
        <AuthForm mode="login" locale={locale} />
      </Card>
    </div>
  );
}
