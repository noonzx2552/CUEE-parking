import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { UserModel } from "@/models/User";
import { adminUserUpdateSchema } from "@/lib/validators/admin";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";

export const PATCH = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const payload = adminUserUpdateSchema.parse(await request.json());
  const params = await context?.params;

  await connectToDatabase();
  const user = await UserModel.findByIdAndUpdate(params?.id, payload, {
    new: true,
    projection: { passwordHash: 0 },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: "admin.user.update",
    targetType: "user",
    targetId: String(user._id),
    metadata: payload,
    ...(await getRequestContext()),
  });

  return jsonOk({ user });
});
