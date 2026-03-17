import { cookies } from "next/headers";
import crypto from "node:crypto";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/constants";
import { isProduction } from "@/lib/env";

export async function issueCsrfToken() {
  const token = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  });
  return token;
}

export async function verifyCsrfToken(request: Request) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const error = new Error("Invalid CSRF token");
    Object.assign(error, { statusCode: 403 });
    throw error;
  }
}
