import { Schema, model, models, type InferSchemaType } from "mongoose";

const smartParkSessionSchema = new Schema(
  {
    slotName: { type: String, required: true, trim: true, index: true },
    lineUserId: { type: String, default: "", index: true },
    startTime: { type: Date, required: true, default: Date.now, index: true },
    durationMinutes: { type: Number, default: 35, min: 0 },
    warnMinutes: { type: Number, default: 20, min: 0 },
    ended: { type: Boolean, default: false, index: true },
    endedAt: { type: Date, default: null },
    source: { type: String, default: "system", trim: true },
  },
  { timestamps: true },
);

smartParkSessionSchema.index({ slotName: 1, ended: 1, createdAt: -1 });

export type SmartParkSessionDocument = InferSchemaType<typeof smartParkSessionSchema> & { _id: string };
export const SmartParkSessionModel =
  models.SmartParkSession || model("SmartParkSession", smartParkSessionSchema);
