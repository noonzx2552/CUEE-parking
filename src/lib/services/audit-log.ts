import { connectToDatabase } from "@/lib/db/mongoose";
import { AuditLogModel } from "@/models/AuditLog";
import type { AuditTargetType } from "@/types";

type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export async function createAuditLog(input: AuditLogInput) {
  await connectToDatabase();

  await AuditLogModel.create({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    ip: input.ip ?? "unknown",
    userAgent: input.userAgent ?? "unknown",
  });
}
