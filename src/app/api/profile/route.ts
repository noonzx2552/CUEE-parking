import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { updateUser } from "@/lib/db/store";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { profileSchema } from "@/lib/validators/auth";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";

export const PATCH = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const session = await requireSession();
  const payload = profileSchema.parse(await request.json());

  const user = await updateUser(
    session.id,
    {
      name: payload.name,
      lineUserId: payload.lineUserId || null,
      ...(payload.lineUserId ? {} : { lineBindToken: null, lineBindExpiresAt: null }),
    },
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
