import { endOfDay, startOfDay } from "date-fns";

import {
  createParkingSpace,
  findParkingSpaceByCode,
  getParkingSpaceByIdRecord,
  hydrateReservation,
  listParkingSpaces,
  listReservations,
  listUsers,
  updateParkingSpace,
} from "@/lib/db/store";
import { reconcileReservationStatuses } from "@/lib/services/reconciliation";

let defaultParkingBootstrapPromise: Promise<void> | null = null;

function getDefaultParkingSpaces() {
  return Array.from({ length: 4 }, (_, index) => ({
    code: `A${String(index + 1).padStart(2, "0")}`,
    zone: "A",
    type: index < 2 ? ("ev" as const) : ("normal" as const),
    status: "available" as const,
    description: "Main building parking",
  }));
}

async function ensureDefaultParkingSpaces() {
  if (!defaultParkingBootstrapPromise) {
    defaultParkingBootstrapPromise = (async () => {
      const spaces = await listParkingSpaces();
      if (spaces.length > 0) {
        return;
      }

      for (const input of getDefaultParkingSpaces()) {
        await createParkingSpace(input);
      }
    })().catch((error) => {
      defaultParkingBootstrapPromise = null;
      throw error;
    });
  }

  await defaultParkingBootstrapPromise;
}

export async function getParkingSpaces(filters?: {
  zone?: string;
  type?: string;
  status?: string;
  search?: string;
}) {
  await ensureDefaultParkingSpaces();
  await reconcileReservationStatuses();

  let spaces = await listParkingSpaces();

  if (filters?.zone) spaces = spaces.filter((space) => space.zone === filters.zone);
  if (filters?.type) spaces = spaces.filter((space) => space.type === filters.type);
  if (filters?.status) spaces = spaces.filter((space) => space.status === filters.status);
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    spaces = spaces.filter((space) => space.code.toLowerCase().includes(query));
  }

  return spaces;
}

export async function getParkingSpaceById(id: string) {
  await ensureDefaultParkingSpaces();
  await reconcileReservationStatuses();
  return getParkingSpaceByIdRecord(id);
}

export async function getUserReservations(userId: string) {
  await reconcileReservationStatuses();
  const reservations = (await listReservations())
    .filter((reservation) => reservation.userId === userId)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));

  return Promise.all(reservations.map((reservation) => hydrateReservation(reservation, { includeUser: false })));
}

export async function getAdminReservations() {
  await reconcileReservationStatuses();
  const reservations = await listReservations();
  return Promise.all(reservations.map((reservation) => hydrateReservation(reservation)));
}

export async function getAdminUsers() {
  return (await listUsers()).map((user) =>
    Object.fromEntries(Object.entries(user).filter(([key]) => key !== "passwordHash")),
  );
}

export async function getAdminStats() {
  await ensureDefaultParkingSpaces();
  await reconcileReservationStatuses();

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();

  const [spaces, reservations, users] = await Promise.all([
    listParkingSpaces(),
    listReservations(),
    listUsers(),
  ]);

  const byStatus = {
    available: 0,
    reserved: 0,
    occupied: 0,
    maintenance: 0,
  };

  const zoneUsageMap = new Map<string, { zone: string; total: number; reserved: number }>();

  for (const space of spaces) {
    byStatus[space.status] += 1;

    const zoneUsage = zoneUsageMap.get(space.zone) ?? { zone: space.zone, total: 0, reserved: 0 };
    zoneUsage.total += 1;
    if (space.status === "reserved" || space.status === "occupied") {
      zoneUsage.reserved += 1;
    }
    zoneUsageMap.set(space.zone, zoneUsage);
  }

  const todayReservations = reservations.filter((reservation) => {
    const createdAt = new Date(reservation.createdAt).getTime();
    return createdAt >= todayStart && createdAt <= todayEnd;
  }).length;

  return {
    totalSpaces: spaces.length,
    byStatus,
    todayReservations,
    usersCount: users.length,
    zoneUsage: Array.from(zoneUsageMap.values()).sort((a, b) => a.zone.localeCompare(b.zone)),
  };
}

export async function ensureParkingSpaceCodeAvailable(code: string, ignoreId?: string) {
  const existing = await findParkingSpaceByCode(code);
  return !existing || existing._id === ignoreId;
}

export async function touchParkingSpaceStatus(id: string, status: "available" | "reserved" | "occupied" | "maintenance") {
  return updateParkingSpace(id, {
    status,
    lastStatusChangedAt: new Date().toISOString(),
  });
}
