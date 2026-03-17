import { endOfDay, startOfDay } from "date-fns";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { ReservationModel } from "@/models/Reservation";
import { UserModel } from "@/models/User";

export async function getParkingSpaces(filters?: {
  zone?: string;
  type?: string;
  status?: string;
  search?: string;
}) {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filters?.zone) query.zone = filters.zone;
  if (filters?.type) query.type = filters.type;
  if (filters?.status) query.status = filters.status;
  if (filters?.search) query.code = { $regex: filters.search, $options: "i" };

  return ParkingSpaceModel.find(query).sort({ zone: 1, code: 1 }).lean();
}

export async function getParkingSpaceById(id: string) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return ParkingSpaceModel.findById(id).lean();
}

export async function getUserReservations(userId: string) {
  await connectToDatabase();
  return ReservationModel.find({ userId })
    .populate("parkingSpaceId")
    .sort({ startTime: -1 })
    .lean();
}

export async function getAdminReservations() {
  await connectToDatabase();
  return ReservationModel.find({})
    .populate("parkingSpaceId")
    .populate("userId")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAdminUsers() {
  await connectToDatabase();
  return UserModel.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
}

export async function getAdminStats() {
  await connectToDatabase();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [spaceCounts, totalSpaces, todayReservations, zoneUsage, usersCount] = await Promise.all([
    ParkingSpaceModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ParkingSpaceModel.countDocuments(),
    ReservationModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    ParkingSpaceModel.aggregate([
      {
        $group: {
          _id: "$zone",
          total: { $sum: 1 },
          reserved: {
            $sum: {
              $cond: [{ $in: ["$status", ["reserved", "occupied"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    UserModel.countDocuments(),
  ]);

  const byStatus = {
    available: 0,
    reserved: 0,
    occupied: 0,
    maintenance: 0,
  };

  for (const item of spaceCounts) {
    if (item._id in byStatus) {
      byStatus[item._id as keyof typeof byStatus] = item.count;
    }
  }

  return {
    totalSpaces,
    byStatus,
    todayReservations,
    usersCount,
    zoneUsage: zoneUsage.map((item) => ({
      zone: item._id,
      total: item.total,
      reserved: item.reserved,
    })),
  };
}
