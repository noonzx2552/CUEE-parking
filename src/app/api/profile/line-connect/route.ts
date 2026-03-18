import crypto from "node:crypto";

import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { connectToDatabase } from "@/lib/db/mongoose";
import { env } from "@/lib/env";
import { UserModel } from "@/models/User";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { createAuditLog } from "@/lib/services/audit-log";
import { getRequestContext } from "@/lib/security/request";

const LINE_BIND_TOKEN_TTL_MS = 10 * 60 * 1000;

export const POST = withErrorHandler(async (request) => {
  await verifyCsrfToken(request);
  const session = await requireSession();

  await connectToDatabase();
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + LINE_BIND_TOKEN_TTL_MS);

  await UserModel.findByIdAndUpdate(session.id, {
    $set: {
      lineBindToken: token,
      lineBindExpiresAt: expiresAt,
    },
  });

  await createAuditLog({
    actorUserId: session.id,
    action: "profile.line_bind_token.create",
    targetType: "user",
    targetId: session.id,
    metadata: { expiresAt: expiresAt.toISOString() },
    ...(await getRequestContext()),
  });

  const command = `bind ${token}`;
  const connectUrl = env.LINE_OA_ID
    ? `https://line.me/R/oaMessage/${encodeURIComponent(env.LINE_OA_ID)}/?${encodeURIComponent(command)}`
    : "";

  return jsonOk({
    token,
    expiresAt: expiresAt.toISOString(),
    command,
    connectUrl,
  });
});
