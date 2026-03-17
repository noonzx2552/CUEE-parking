import { Schema, model, models, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1, action: 1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: string };
export const AuditLogModel = models.AuditLog || model("AuditLog", auditLogSchema);
