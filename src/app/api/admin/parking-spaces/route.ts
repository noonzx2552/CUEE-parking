import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { parkingSpaceSchema } from "@/lib/validators/parking";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";
import { ACTION_RATE_LIMIT_MAX, ACTION_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { assertRateLimit } from "@/lib/security/rate-limit";

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const requestContext = await getRequestContext();
  assertRateLimit(`admin:parking:create:${admin.id}`, ACTION_RATE_LIMIT_MAX, ACTION_RATE_LIMIT_WINDOW_MS);

  const payload = parkingSpaceSchema.parse(await request.json());
  await connectToDatabase();
  const parkingSpace = await ParkingSpaceModel.create(payload);

  await createAuditLog({
    actorUserId: admin.id,
    action: "admin.parking.create",
    targetType: "parking-space",
    targetId: String(parkingSpace._id),
    metadata: payload,
    ...requestContext,
  });

  return jsonOk({ parkingSpace }, { status: 201 });
});
