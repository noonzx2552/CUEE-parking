import { redirect } from "next/navigation";

import { LineConnectLauncher } from "@/components/line/line-connect-launcher";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LineConnectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">LINE Connect</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">เชื่อมต่อ LINE กับระบบ</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          หน้านี้ใช้สำหรับเชื่อม LINE กับบัญชีของคุณ เพื่อให้ระบบส่งแจ้งเตือนการจองและสถานะที่จอดได้โดยตรง หลังจาก LINE เปิดขึ้นมาแล้ว ให้กดส่งข้อความในแชตด้วยเพื่อยืนยันการเชื่อมต่อ
        </p>
      </div>

      <Card>
        <LineConnectLauncher currentName={user.name} hasLineConnection={Boolean(user.lineUserId)} />
      </Card>
    </div>
  );
}
