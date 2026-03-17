import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { lineTestSchema } from "@/lib/validators/admin";
import { pushLineMessage } from "@/lib/services/line";

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const payload = lineTestSchema.parse(await request.json());

  await connectToDatabase();
  const user = await UserModel.findById(admin.id).lean();
  const result = await pushLineMessage(user?.lineUserId, [payload.message]);

  return jsonOk({ result });
});
