import crypto from "node:crypto";

import type { AuditTargetType, ParkingStatus, ParkingType, ReservationStatus, UserRole } from "@/types";
import { connectToDatabase } from "@/lib/db/redis";

type EntityKind =
  | "users"
  | "parking-spaces"
  | "reservations"
  | "audit-logs"
  | "smartpark-slots"
  | "smartpark-sessions";

type EntityBase = {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = EntityBase & {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  lineUserId: string | null;
  lineBindToken: string | null;
  lineBindExpiresAt: string | null;
  isActive: boolean;
};

export type ParkingSpaceRecord = EntityBase & {
  code: string;
  zone: string;
  type: ParkingType;
  status: ParkingStatus;
  description: string;
  reservationLockUntil: string | null;
  lastStatusChangedAt: string;
};

export type ReservationRecord = EntityBase & {
  userId: string;
  parkingSpaceId: string;
  startTime: string;
  endTime: string;
  parkingFee: number;
  feeRatePerHour: number;
  feeCurrency: string;
  status: ReservationStatus;
  note: string;
  checkInDeadline: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  entryQrToken: string | null;
  entryQrExpiresAt: string | null;
  exitQrToken: string | null;
  exitQrExpiresAt: string | null;
};

export type AuditLogRecord = EntityBase & {
  actorUserId: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
};

export type SmartParkSlotRecord = {
  slotName: string;
  status: "vacant" | "occupied";
  updatedBy: string;
  updatedAt: string;
};

export type SmartParkSessionRecord = EntityBase & {
  slotName: string;
  lineUserId: string;
  startTime: string;
  durationMinutes: number;
  warnMinutes: number;
  ended: boolean;
  endedAt: string | null;
  source: string;
};

type ReservationWithRelations = Omit<ReservationRecord, "userId" | "parkingSpaceId"> & {
  userId: UserRecord | string | null;
  parkingSpaceId: ParkingSpaceRecord | string | null;
};

const KEY_PREFIX = "cuee";

function collectionKey(kind: EntityKind) {
  return `${KEY_PREFIX}:${kind}:ids`;
}

function entityKey(kind: EntityKind, id: string) {
  return `${KEY_PREFIX}:${kind}:${id}`;
}

function parkingLockKey(id: string) {
  return `${KEY_PREFIX}:locks:parking:${id}`;
}

function smartParkSlotKey(slotName: string) {
  return entityKey("smartpark-slots", slotName);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return crypto.randomUUID();
}

async function listEntities<T>(kind: EntityKind): Promise<T[]> {
  const redis = await connectToDatabase();
  const ids = await redis.sMembers(collectionKey(kind));
  if (!ids.length) {
    return [];
  }

  const payloads = await redis.mGet(ids.map((id) => entityKey(kind, id)));
  return payloads
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as T);
}

async function getEntity<T>(kind: EntityKind, id: string): Promise<T | null> {
  const redis = await connectToDatabase();
  const payload = await redis.get(entityKey(kind, id));
  return payload ? (JSON.parse(payload) as T) : null;
}

async function saveEntity<T extends { _id: string }>(kind: EntityKind, entity: T) {
  const redis = await connectToDatabase();
  await redis
    .multi()
    .set(entityKey(kind, entity._id), JSON.stringify(entity))
    .sAdd(collectionKey(kind), entity._id)
    .exec();
  return entity;
}

async function deleteEntity(kind: EntityKind, id: string) {
  const redis = await connectToDatabase();
  await redis.multi().del(entityKey(kind, id)).sRem(collectionKey(kind), id).exec();
}

async function listUsersRaw() {
  return listEntities<UserRecord>("users");
}

export async function listUsers() {
  return (await listUsersRaw()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUserById(id: string) {
  return getEntity<UserRecord>("users", id);
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return (await listUsersRaw()).find((user) => user.email === normalized) ?? null;
}

export async function findUserByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  return (await listUsersRaw()).find((user) => user.username === normalized) ?? null;
}

export async function findUserByLineBindToken(token: string, now = new Date()) {
  const nowTime = now.getTime();
  return (
    (await listUsersRaw()).find((user) => {
      if (user.lineBindToken !== token || !user.lineBindExpiresAt) {
        return false;
      }
      return new Date(user.lineBindExpiresAt).getTime() > nowTime;
    }) ?? null
  );
}

export async function createUser(input: Omit<UserRecord, keyof EntityBase | "_id">) {
  const timestamp = nowIso();
  const user: UserRecord = {
    _id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
  return saveEntity("users", user);
}

export async function updateUser(id: string, patch: Partial<Omit<UserRecord, "_id" | "createdAt">>) {
  const user = await getUserById(id);
  if (!user) {
    return null;
  }

  const nextUser: UserRecord = {
    ...user,
    ...patch,
    updatedAt: nowIso(),
  };

  return saveEntity("users", nextUser);
}

export async function upsertAdminUser(input: { email: string; passwordHash: string; name: string; username: string }) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    return updateUser(existing._id, {
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: "admin",
      isActive: true,
    });
  }

  return createUser({
    name: input.name,
    username: input.username,
    email: input.email,
    passwordHash: input.passwordHash,
    role: "admin",
    lineUserId: null,
    lineBindToken: null,
    lineBindExpiresAt: null,
    isActive: true,
  });
}

async function listParkingSpacesRaw() {
  return listEntities<ParkingSpaceRecord>("parking-spaces");
}

export async function listParkingSpaces() {
  return (await listParkingSpacesRaw()).sort((a, b) =>
    a.zone.localeCompare(b.zone) || a.code.localeCompare(b.code),
  );
}

export async function getParkingSpaceByIdRecord(id: string) {
  return getEntity<ParkingSpaceRecord>("parking-spaces", id);
}

export async function findParkingSpaceByCode(code: string) {
  return (await listParkingSpacesRaw()).find((space) => space.code === code.trim()) ?? null;
}

export async function createParkingSpace(
  input: Omit<ParkingSpaceRecord, keyof EntityBase | "_id" | "lastStatusChangedAt" | "reservationLockUntil"> & {
    reservationLockUntil?: string | null;
    lastStatusChangedAt?: string;
  },
) {
  const timestamp = nowIso();
  const parkingSpace: ParkingSpaceRecord = {
    _id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    reservationLockUntil: input.reservationLockUntil ?? null,
    lastStatusChangedAt: input.lastStatusChangedAt ?? timestamp,
    ...input,
  };

  return saveEntity("parking-spaces", parkingSpace);
}

export async function updateParkingSpace(
  id: string,
  patch: Partial<Omit<ParkingSpaceRecord, "_id" | "createdAt">>,
) {
  const space = await getParkingSpaceByIdRecord(id);
  if (!space) {
    return null;
  }

  const nextSpace: ParkingSpaceRecord = {
    ...space,
    ...patch,
    updatedAt: nowIso(),
  };

  return saveEntity("parking-spaces", nextSpace);
}

export async function deleteParkingSpace(id: string) {
  const existing = await getParkingSpaceByIdRecord(id);
  if (!existing) {
    return null;
  }

  await deleteEntity("parking-spaces", id);
  return existing;
}

async function listReservationsRaw() {
  return listEntities<ReservationRecord>("reservations");
}

export async function getReservationById(id: string) {
  return getEntity<ReservationRecord>("reservations", id);
}

export async function findReservationByToken(mode: "entry" | "exit", token: string) {
  const reservations = await listReservationsRaw();
  const field = mode === "entry" ? "entryQrToken" : "exitQrToken";
  return reservations.find((reservation) => reservation[field] === token) ?? null;
}

export async function createReservationRecord(
  input: Omit<ReservationRecord, keyof EntityBase | "_id">,
) {
  const timestamp = nowIso();
  const reservation: ReservationRecord = {
    _id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };

  return saveEntity("reservations", reservation);
}

export async function updateReservation(
  id: string,
  patch: Partial<Omit<ReservationRecord, "_id" | "createdAt">>,
) {
  const reservation = await getReservationById(id);
  if (!reservation) {
    return null;
  }

  const nextReservation: ReservationRecord = {
    ...reservation,
    ...patch,
    updatedAt: nowIso(),
  };

  return saveEntity("reservations", nextReservation);
}

export async function listReservations() {
  return (await listReservationsRaw()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createAuditLogRecord(input: Omit<AuditLogRecord, keyof EntityBase | "_id">) {
  const timestamp = nowIso();
  const auditLog: AuditLogRecord = {
    _id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
  return saveEntity("audit-logs", auditLog);
}

export async function listAuditLogs() {
  return (await listEntities<AuditLogRecord>("audit-logs")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSmartParkSlotRecord(slotName: string) {
  const redis = await connectToDatabase();
  const payload = await redis.get(smartParkSlotKey(slotName));
  return payload ? (JSON.parse(payload) as SmartParkSlotRecord) : null;
}

export async function listSmartParkSlots() {
  const redis = await connectToDatabase();
  const slotNames = await redis.sMembers(collectionKey("smartpark-slots"));
  if (!slotNames.length) {
    return [];
  }

  const payloads = await redis.mGet(slotNames.map((slotName) => smartParkSlotKey(slotName)));
  return payloads
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as SmartParkSlotRecord)
    .sort((a, b) => a.slotName.localeCompare(b.slotName));
}

export async function saveSmartParkSlot(slot: SmartParkSlotRecord) {
  const redis = await connectToDatabase();
  await redis
    .multi()
    .set(smartParkSlotKey(slot.slotName), JSON.stringify(slot))
    .sAdd(collectionKey("smartpark-slots"), slot.slotName)
    .exec();
  return slot;
}

export async function listSmartParkSessions() {
  return (await listEntities<SmartParkSessionRecord>("smartpark-sessions")).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createSmartParkSessionRecord(
  input: Omit<SmartParkSessionRecord, keyof EntityBase | "_id">,
) {
  const timestamp = nowIso();
  const session: SmartParkSessionRecord = {
    _id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };

  return saveEntity("smartpark-sessions", session);
}

export async function updateSmartParkSession(
  id: string,
  patch: Partial<Omit<SmartParkSessionRecord, "_id" | "createdAt">>,
) {
  const session = await getEntity<SmartParkSessionRecord>("smartpark-sessions", id);
  if (!session) {
    return null;
  }

  const nextSession: SmartParkSessionRecord = {
    ...session,
    ...patch,
    updatedAt: nowIso(),
  };

  return saveEntity("smartpark-sessions", nextSession);
}

export async function acquireParkingLock(id: string, ttlMs: number) {
  const redis = await connectToDatabase();
  const token = makeId();
  const result = await redis.set(parkingLockKey(id), token, { NX: true, PX: ttlMs });
  if (result !== "OK") {
    return null;
  }
  return token;
}

export async function releaseParkingLock(id: string) {
  const redis = await connectToDatabase();
  await redis.del(parkingLockKey(id));
}

export async function resetStore() {
  const redis = await connectToDatabase();
  const collections: EntityKind[] = [
    "users",
    "parking-spaces",
    "reservations",
    "audit-logs",
    "smartpark-slots",
    "smartpark-sessions",
  ];

  for (const collection of collections) {
    const ids = await redis.sMembers(collectionKey(collection));
    if (ids.length) {
      const keys =
        collection === "smartpark-slots"
          ? ids.map((id) => smartParkSlotKey(id))
          : ids.map((id) => entityKey(collection, id));
      await redis.del(keys);
    }
    await redis.del(collectionKey(collection));
  }
}

export async function hydrateReservation(
  reservation: ReservationRecord,
  options: { includeUser?: boolean; includeParkingSpace?: boolean } = {},
): Promise<ReservationWithRelations> {
  const includeUser = options.includeUser ?? true;
  const includeParkingSpace = options.includeParkingSpace ?? true;

  const [user, parkingSpace] = await Promise.all([
    includeUser ? getUserById(reservation.userId) : Promise.resolve(reservation.userId),
    includeParkingSpace ? getParkingSpaceByIdRecord(reservation.parkingSpaceId) : Promise.resolve(reservation.parkingSpaceId),
  ]);

  return {
    ...reservation,
    userId: user,
    parkingSpaceId: parkingSpace,
  };
}
