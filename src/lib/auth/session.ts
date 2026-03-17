import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { AppError } from "@/lib/errors";
import { env, isProduction } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/mongoose";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { UserModel } from "@/models/User";
import type { SessionUser } from "@/types";

const secret = new TextEncoder().encode(env.SESSION_SECRET);

type SessionPayload = SessionUser & {
  exp: number;
  iat: number;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify<SessionPayload>(token, secret);
    return verified.payload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new AppError("Authentication required", 401);
  }
  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (session.role !== "admin") {
    throw new AppError("Forbidden", 403);
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.id).lean();

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    lineUserId: user.lineUserId,
    isActive: user.isActive,
  };
}
