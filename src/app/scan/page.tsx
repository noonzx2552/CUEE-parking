import { redirect } from "next/navigation";

import { ScanAccessClient } from "@/components/parking/scan-access-client";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const mode = params.mode === "exit" ? "exit" : "entry";
  const view = params.view === "camera" ? "camera" : "home";
  const redirectPath = `/scan?mode=${mode}${view === "camera" ? "&view=camera" : ""}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ScanAccessClient initialMode={mode} initialToken={token} initialView={view} />
    </div>
  );
}
