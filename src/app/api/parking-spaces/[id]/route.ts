import { withErrorHandler, jsonOk } from "@/lib/api";
import { getParkingSpaceById } from "@/lib/data";
import { AppError } from "@/lib/errors";

export const GET = withErrorHandler(async (_request, context) => {
  const params = await context?.params;
  const parkingSpace = await getParkingSpaceById(params?.id ?? "");

  if (!parkingSpace) {
    throw new AppError("Parking space not found", 404);
  }

  return jsonOk({ parkingSpace });
});
