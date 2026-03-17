import { Schema, model, models, type InferSchemaType } from "mongoose";

const reservationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    parkingSpaceId: { type: Schema.Types.ObjectId, ref: "ParkingSpace", required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "cancelled", "expired", "completed"],
      default: "confirmed",
      index: true,
    },
    note: { type: String, default: "", trim: true, maxlength: 280 },
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reservationSchema.index({ userId: 1, status: 1, startTime: -1 });
reservationSchema.index({ parkingSpaceId: 1, status: 1, startTime: 1, endTime: 1 });

export type ReservationDocument = InferSchemaType<typeof reservationSchema> & { _id: string };
export const ReservationModel = models.Reservation || model("Reservation", reservationSchema);
