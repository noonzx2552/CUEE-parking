import { addMinutes } from "date-fns";
import bcrypt from "bcryptjs";

import {
  createParkingSpace,
  createReservationRecord,
  createUser,
  resetStore,
} from "@/lib/db/store";

function usernameFromEmail(email: string) {
  return email.trim().toLowerCase().replace(/@/g, "_at_").replace(/[^a-z0-9_]/g, "_");
}

async function seed() {
  await resetStore();

  const adminPasswordHash = await bcrypt.hash("Admin12345!", 12);
  const opsAdminPasswordHash = await bcrypt.hash("OpsAdmin12345!", 12);
  const userPasswordHash = await bcrypt.hash("User12345!", 12);

  const [admin, opsAdmin, demoUser] = await Promise.all([
    createUser({
      name: "CUEE Admin",
      username: usernameFromEmail("admin@cuee.local"),
      email: "admin@cuee.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      lineUserId: null,
      lineBindToken: null,
      lineBindExpiresAt: null,
      isActive: true,
    }),
    createUser({
      name: "Operations Admin",
      username: usernameFromEmail("opsadmin@cuee.local"),
      email: "opsadmin@cuee.local",
      passwordHash: opsAdminPasswordHash,
      role: "admin",
      lineUserId: null,
      lineBindToken: null,
      lineBindExpiresAt: null,
      isActive: true,
    }),
    createUser({
      name: "Demo User",
      username: usernameFromEmail("user@cuee.local"),
      email: "user@cuee.local",
      passwordHash: userPasswordHash,
      role: "user",
      lineUserId: null,
      lineBindToken: null,
      lineBindExpiresAt: null,
      isActive: true,
    }),
  ]);

  const spaces = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      createParkingSpace({
        code: `A${String(index + 1).padStart(2, "0")}`,
        zone: "A",
        type: index < 2 ? "ev" : "normal",
        status: "available",
        description: "Main building parking",
      }),
    ),
  );

  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await createReservationRecord({
    userId: demoUser._id,
    parkingSpaceId: spaces[0]._id,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    parkingFee: 30,
    feeRatePerHour: 30,
    feeCurrency: "THB",
    status: "confirmed",
    note: "Seeded demo reservation",
    checkInDeadline: addMinutes(startTime, 10).toISOString(),
    checkInAt: null,
    checkOutAt: null,
    entryQrToken: null,
    entryQrExpiresAt: null,
    exitQrToken: null,
    exitQrExpiresAt: null,
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
  .finally(() => {
    process.exit();
  });
