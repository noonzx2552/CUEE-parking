import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { deleteParkingSpace, getParkingSpaceByIdRecord, updateParkingSpace } from "@/lib/db/store";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { parkingSpaceSchema } from "@/lib/validators/parking";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";
import { ensureParkingSpaceCodeAvailable } from "@/lib/data";

export const PATCH = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const payload = parkingSpaceSchema.partial().parse(await request.json());
  const params = await context?.params;
  const parkingSpaceId = params?.id ?? "";

  const current = await getParkingSpaceByIdRecord(parkingSpaceId);
  if (!current) {
    throw new AppError("Parking space not found", 404);
  }

  if (payload.code && !(await ensureParkingSpaceCodeAvailable(payload.code, parkingSpaceId))) {
    throw new AppError("Parking space code already exists", 409);
  }

  const parkingSpace = await updateParkingSpace(parkingSpaceId, payload);
  if (!parkingSpace) {
    throw new AppError("Parking space not found", 404);
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: "admin.parking.update",
    targetType: "parking-space",
    targetId: String(parkingSpace._id),
    metadata: payload,
    ...(await getRequestContext()),
  });

  return jsonOk({ parkingSpace });
});

export const DELETE = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const params = await context?.params;

  const parkingSpace = await deleteParkingSpace(params?.id ?? "");
  if (!parkingSpace) {
    throw new AppError("Parking space not found", 404);
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: "admin.parking.delete",
    targetType: "parking-space",
    targetId: String(parkingSpace._id),
    metadata: { code: parkingSpace.code },
    ...(await getRequestContext()),
  });

  return jsonOk({ success: true });
});
