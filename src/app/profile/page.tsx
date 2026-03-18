import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Account settings</h1>
      </div>
      <Card>
        <ProfileForm
          initialValues={{
            name: user.name,
            lineUserId: user.lineUserId ?? "",
          }}
          lineAddFriendUrl={env.LINE_ADD_FRIEND_URL}
        />
      </Card>
    </div>
  );
}
