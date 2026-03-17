import { connectToDatabase } from "@/lib/db/mongoose";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { ReservationModel } from "@/models/Reservation";

export async function reconcileReservationStatuses() {
  await connectToDatabase();
  const now = new Date();

  await ReservationModel.updateMany(
    {
      status: { $in: ["pending", "confirmed"] },
      endTime: { $lt: now },
    },
    { $set: { status: "expired" } },
  );

  const activeSpaceIds = await ReservationModel.distinct("parkingSpaceId", {
    status: { $in: ["pending", "confirmed"] },
    startTime: { $lte: now },
    endTime: { $gte: now },
  });

  await ParkingSpaceModel.updateMany(
    { _id: { $nin: activeSpaceIds }, status: { $ne: "maintenance" } },
    { $set: { status: "available" } },
  );

  await ParkingSpaceModel.updateMany(
    { _id: { $in: activeSpaceIds }, status: { $ne: "maintenance" } },
    { $set: { status: "reserved" } },
  );
}
