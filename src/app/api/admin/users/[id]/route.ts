import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getUserById, updateUser } from "@/lib/db/store";
import { adminUserUpdateSchema } from "@/lib/validators/admin";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";

export const PATCH = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const payload = adminUserUpdateSchema.parse(await request.json());
  const params = await context?.params;
  const userId = params?.id ?? "";

  if (!(await getUserById(userId))) {
    throw new AppError("User not found", 404);
  }

  const user = await updateUser(userId, payload);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;

  await createAuditLog({
    actorUserId: admin.id,
    action: "admin.user.update",
    targetType: "user",
    targetId: String(user._id),
    metadata: payload,
    ...(await getRequestContext()),
  });

  return jsonOk({ user: safeUser });
});
