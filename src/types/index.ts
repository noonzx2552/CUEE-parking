export type UserRole = "user" | "admin";

export type ParkingStatus = "available" | "reserved" | "occupied" | "maintenance";
export type ParkingType = "normal" | "ev" | "disabled";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "completed";

export type AuditTargetType =
  | "user"
  | "parking-space"
  | "reservation"
  | "auth"
  | "notification";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lineUserId?: string | null;
};

export type ApiErrorShape = {
  message: string;
  issues?: string[];
};
