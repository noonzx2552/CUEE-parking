import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongoose";
import { ParkingSpaceModel } from "@/models/ParkingSpace";
import { ReservationModel } from "@/models/Reservation";
import { UserModel } from "@/models/User";

function usernameFromEmail(email: string) {
  return email.trim().toLowerCase().replace(/@/g, "_at_").replace(/[^a-z0-9_]/g, "_");
}

async function seed() {
  await connectToDatabase();

  await Promise.all([
    ReservationModel.deleteMany({}),
    ParkingSpaceModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  const adminPasswordHash = await bcrypt.hash("Admin12345!", 12);
  const opsAdminPasswordHash = await bcrypt.hash("OpsAdmin12345!", 12);
  const userPasswordHash = await bcrypt.hash("User12345!", 12);

  const [admin, opsAdmin, demoUser] = await UserModel.create([
    {
      name: "CUEE Admin",
      username: usernameFromEmail("admin@cuee.local"),
      email: "admin@cuee.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
    },
    {
      name: "Operations Admin",
      username: usernameFromEmail("opsadmin@cuee.local"),
      email: "opsadmin@cuee.local",
      passwordHash: opsAdminPasswordHash,
      role: "admin",
      isActive: true,
    },
    {
      name: "Demo User",
      username: usernameFromEmail("user@cuee.local"),
      email: "user@cuee.local",
      passwordHash: userPasswordHash,
      role: "user",
      isActive: true,
    },
  ]);

  const spaces = [
    ...Array.from({ length: 8 }, (_, index) => ({
      code: `A${String(index + 1).padStart(2, "0")}`,
      zone: "A",
      type: index < 2 ? "ev" : "normal",
      status: "available",
      description: "Main building parking",
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      code: `B${String(index + 1).padStart(2, "0")}`,
      zone: "B",
      type: index === 0 ? "disabled" : "normal",
      status: "available",
      description: "Faculty parking area",
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      code: `VIP${String(index + 1).padStart(2, "0")}`,
      zone: "VIP",
      type: "normal",
      status: index === 0 ? "maintenance" : "available",
      description: "Reserved for special access",
    })),
  ];

  const parkingSpaces = await ParkingSpaceModel.create(spaces);

  await ReservationModel.create({
    userId: demoUser._id,
    parkingSpaceId: parkingSpaces[0]._id,
    startTime: new Date(Date.now() + 60 * 60 * 1000),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    status: "confirmed",
    note: "Seeded demo reservation",
  });

  console.log("Seed completed");
  console.log(`Admin: ${admin.email} / Admin12345!`);
  console.log(`Ops Admin: ${opsAdmin.email} / OpsAdmin12345!`);
  console.log(`User: ${demoUser.email} / User12345!`);
}

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    process.exit();
  });
