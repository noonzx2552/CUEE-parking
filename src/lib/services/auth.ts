import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { createSession } from "@/lib/auth/session";
import { UserModel } from "@/models/User";
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
  await connectToDatabase();

  const existingUser = await UserModel.findOne({ email: input.email }).lean();
  if (existingUser) {
    throw new AppError("Unable to create account", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    name: input.name,
    username: usernameFromEmail(input.email),
    email: input.email,
    passwordHash,
    role: "user",
    lineUserId: input.lineUserId || null,
    isActive: true,
  });

  await createSession({
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    lineUserId: user.lineUserId,
  });

  const requestContext = await getRequestContext();
  await createAuditLog({
    actorUserId: String(user._id),
    action: "auth.register",
    targetType: "user",
    targetId: String(user._id),
    metadata: { email: user.email },
    ...requestContext,
  });

  void sendDiscordEvent(
    "New Account Registered",
    `User ${user.email} created a new account.`,
  );

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  await connectToDatabase();

  const user = await UserModel.findOne({ email: input.email });
  const requestContext = await getRequestContext();

  if (!user || !user.isActive) {
    await createAuditLog({
      action: "auth.login.failed",
      targetType: "auth",
      targetId: input.email,
      metadata: { email: input.email },
      ...requestContext,
    });
    throw new AppError("Invalid credentials", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    await createAuditLog({
      actorUserId: String(user._id),
      action: "auth.login.failed",
      targetType: "auth",
      targetId: String(user._id),
      metadata: { email: input.email },
      ...requestContext,
    });
    throw new AppError("Invalid credentials", 401);
  }

  await createSession({
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    lineUserId: user.lineUserId,
  });

  await createAuditLog({
    actorUserId: String(user._id),
    action: "auth.login.success",
    targetType: "user",
    targetId: String(user._id),
    metadata: { email: user.email },
    ...requestContext,
  });

  return user;
}
