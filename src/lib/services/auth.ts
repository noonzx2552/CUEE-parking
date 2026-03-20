import bcrypt from "bcryptjs";

import { AppError } from "@/lib/errors";
import { createSession } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/db/store";
import { createAuditLog } from "@/lib/services/audit-log";
import { sendDiscordEvent } from "@/lib/services/discord";
import { getRequestContext } from "@/lib/security/request";

function usernameFromEmail(email: string) {
  return email.trim().toLowerCase().replace(/@/g, "_at_").replace(/[^a-z0-9_]/g, "_");
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  lineUserId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError("อีเมลนี้ถูกใช้งานแล้ว", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await createUser({
    name: input.name,
    username: usernameFromEmail(email),
    email,
    passwordHash,
    role: "user",
    lineUserId: input.lineUserId || null,
    lineBindToken: null,
    lineBindExpiresAt: null,
    isActive: true,
  });

  await createSession({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    lineUserId: user.lineUserId,
  });

  const requestContext = await getRequestContext();
  await createAuditLog({
    actorUserId: user._id,
    action: "auth.register",
    targetType: "user",
    targetId: user._id,
    metadata: { email: user.email },
    ...requestContext,
  });

  void sendDiscordEvent("New Account Registered", `User ${user.email} created a new account.`);

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  const requestContext = await getRequestContext();

  if (!user || !user.isActive) {
    await createAuditLog({
      action: "auth.login.failed",
      targetType: "auth",
      targetId: email,
      metadata: { email },
      ...requestContext,
    });
    throw new AppError("Invalid credentials", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    await createAuditLog({
      actorUserId: user._id,
      action: "auth.login.failed",
      targetType: "auth",
      targetId: user._id,
      metadata: { email },
      ...requestContext,
    });
    throw new AppError("Invalid credentials", 401);
  }

  await createSession({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    lineUserId: user.lineUserId,
  });

  await createAuditLog({
    actorUserId: user._id,
    action: "auth.login.success",
    targetType: "user",
    targetId: user._id,
    metadata: { email: user.email },
    ...requestContext,
  });

  return user;
}
