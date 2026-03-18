import { connectToDatabase } from "@/lib/db/mongoose";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { ReservationModel } from "@/models/Reservation";

export async function reconcileReservationStatuses() {
  await connectToDatabase();
  const now = new Date();

  await ReservationModel.updateMany(
    {
      status: { $in: ["pending", "confirmed"] },
      checkInDeadline: { $lt: now },
      checkInAt: null,
    },
    { $set: { status: "expired" } },
  );

  await ReservationModel.updateMany(
    {
      status: { $in: ["pending", "confirmed"] },
      endTime: { $lt: now },
    },
    { $set: { status: "expired" } },
  );

  const reservedSpaceIds = await ReservationModel.distinct("parkingSpaceId", {
    status: { $in: ["pending", "confirmed"] },
    checkInDeadline: { $gte: now },
  });

  const occupiedSpaceIds = await ReservationModel.distinct("parkingSpaceId", {
    status: "checked-in",
    checkOutAt: null,
  });
  const occupiedSpaceIdSet = new Set(occupiedSpaceIds.map((id) => String(id)));
  const reservedOnlySpaceIds = reservedSpaceIds.filter((id) => !occupiedSpaceIdSet.has(String(id)));

  await ParkingSpaceModel.updateMany(
    {
      _id: { $nin: [...reservedSpaceIds, ...occupiedSpaceIds] },
      status: { $ne: "maintenance" },
    },
    { $set: { status: "available", lastStatusChangedAt: now } },
  );

  await ParkingSpaceModel.updateMany(
    {
      _id: { $in: reservedOnlySpaceIds },
      status: { $ne: "maintenance" },
    },
    { $set: { status: "reserved", lastStatusChangedAt: now } },
  );

  await ParkingSpaceModel.updateMany(
    { _id: { $in: occupiedSpaceIds }, status: { $ne: "maintenance" } },
    { $set: { status: "occupied", lastStatusChangedAt: now } },
  );
}
