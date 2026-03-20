import { Schema, model, models, type InferSchemaType } from "mongoose";

const smartParkSlotSchema = new Schema(
  {
    slotName: { type: String, required: true, unique: true, trim: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["vacant", "occupied"],
      default: "vacant",
      index: true,
    },
    updatedBy: { type: String, default: "system", trim: true },
  },
  { timestamps: true },
);

smartParkSlotSchema.index({ slotName: 1 }, { unique: true });

export type SmartParkSlotDocument = InferSchemaType<typeof smartParkSlotSchema> & { _id: string };
export const SmartParkSlotModel =
  models.SmartParkSlot || model("SmartParkSlot", smartParkSlotSchema);
