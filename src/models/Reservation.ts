import { Schema, model, models, type InferSchemaType } from "mongoose";

const reservationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    parkingSpaceId: { type: Schema.Types.ObjectId, ref: "ParkingSpace", required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    parkingFee: { type: Number, min: 0, default: 0 },
    feeRatePerHour: { type: Number, min: 0, default: 0 },
    feeCurrency: { type: String, default: "THB" },
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "checked-in", "cancelled", "expired", "completed"],
      default: "confirmed",
      index: true,
    },
    note: { type: String, default: "", trim: true, maxlength: 280 },
    checkInDeadline: { type: Date, required: true, index: true },
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },
    entryQrToken: { type: String, default: null, index: true },
    entryQrExpiresAt: { type: Date, default: null, index: true },
    exitQrToken: { type: String, default: null, index: true },
    exitQrExpiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

reservationSchema.index({ userId: 1, status: 1, startTime: -1 });
reservationSchema.index({ parkingSpaceId: 1, status: 1, startTime: 1, endTime: 1 });

export type ReservationDocument = InferSchemaType<typeof reservationSchema> & { _id: string };
export const ReservationModel = models.Reservation || model("Reservation", reservationSchema);
