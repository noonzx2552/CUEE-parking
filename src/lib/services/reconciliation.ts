import { listParkingSpaces, listReservations, updateParkingSpace, updateReservation } from "@/lib/db/store";

export async function reconcileReservationStatuses() {
  const now = Date.now();
  const reservations = await listReservations();

  for (const reservation of reservations) {
    if (
      ["pending", "confirmed"].includes(reservation.status) &&
      !reservation.checkInAt &&
      new Date(reservation.checkInDeadline).getTime() < now
    ) {
      await updateReservation(reservation._id, { status: "expired" });
      continue;
    }

    if (
      ["pending", "confirmed"].includes(reservation.status) &&
      new Date(reservation.endTime).getTime() < now
    ) {
      await updateReservation(reservation._id, { status: "expired" });
    }
  }

  const [spaces, nextReservations] = await Promise.all([listParkingSpaces(), listReservations()]);

  for (const space of spaces) {
    if (space.status === "maintenance") {
      continue;
    }

    const occupied = nextReservations.some(
      (reservation) =>
        reservation.parkingSpaceId === space._id &&
        reservation.status === "checked-in" &&
        !reservation.checkOutAt,
    );

    const reserved = nextReservations.some(
      (reservation) =>
        reservation.parkingSpaceId === space._id &&
        ["pending", "confirmed"].includes(reservation.status) &&
        new Date(reservation.checkInDeadline).getTime() >= now,
    );

    const nextStatus = occupied ? "occupied" : reserved ? "reserved" : "available";
    if (space.status !== nextStatus) {
      await updateParkingSpace(space._id, {
        status: nextStatus,
        lastStatusChangedAt: new Date().toISOString(),
      });
    }
  }
}
