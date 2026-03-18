import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { profileSchema } from "@/lib/validators/auth";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";

export const PATCH = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const session = await requireSession();
  const payload = profileSchema.parse(await request.json());

  await connectToDatabase();
  const user = await UserModel.findByIdAndUpdate(
    session.id,
    {
      $set: {
        name: payload.name,
        lineUserId: payload.lineUserId || null,
        ...(payload.lineUserId ? {} : { lineBindToken: null, lineBindExpiresAt: null }),
      },
    },
    { new: true, projection: { passwordHash: 0 } },
  );

  await createAuditLog({
    actorUserId: session.id,
    action: "profile.update",
    targetType: "user",
    targetId: session.id,
    metadata: { hasLineBinding: Boolean(payload.lineUserId) },
    ...(await getRequestContext()),
  });

  return jsonOk({ user });
});
