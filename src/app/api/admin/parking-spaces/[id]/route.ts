import mongoose from "mongoose";

import { requireAdminSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { parkingSpaceSchema } from "@/lib/validators/parking";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";

export const PATCH = withErrorHandler(async (request, context) => {
  await verifyCsrfToken(request);
  const admin = await requireAdminSession();
  const payload = parkingSpaceSchema.partial().parse(await request.json());
  const params = await context?.params;

  if (!mongoose.Types.ObjectId.isValid(params?.id ?? "")) {
    throw new AppError("Parking space not found", 404);
  }

  await connectToDatabase();
  const parkingSpace = await ParkingSpaceModel.findByIdAndUpdate(params?.id, payload, { new: true });
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

  if (!mongoose.Types.ObjectId.isValid(params?.id ?? "")) {
    throw new AppError("Parking space not found", 404);
  }

  await connectToDatabase();
  const parkingSpace = await ParkingSpaceModel.findByIdAndDelete(params?.id);
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
