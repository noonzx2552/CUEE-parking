import { Schema, model, models, type InferSchemaType } from "mongoose";

const parkingSpaceSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    zone: { type: String, required: true, trim: true, index: true },
    type: { type: String, required: true, enum: ["normal", "ev", "disabled"], index: true },
    status: {
      type: String,
      required: true,
      enum: ["available", "reserved", "occupied", "maintenance"],
      default: "available",
      index: true,
    },
    description: { type: String, default: "", trim: true, maxlength: 280 },
    reservationLockUntil: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

parkingSpaceSchema.index({ code: 1 }, { unique: true });
parkingSpaceSchema.index({ zone: 1, type: 1, status: 1 });

export type ParkingSpaceDocument = InferSchemaType<typeof parkingSpaceSchema> & { _id: string };
export const ParkingSpaceModel = models.ParkingSpace || model("ParkingSpace", parkingSpaceSchema);
