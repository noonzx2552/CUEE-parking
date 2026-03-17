import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const publicPaths = ["/", "/login", "/register"];
const secret = new TextEncoder().encode(env.SESSION_SECRET);

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as { role?: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/api/webhooks/line") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = await getSession(request);

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/reservations") || pathname.startsWith("/profile")) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && session?.role !== "admin") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (publicPaths.includes(pathname) && session && (pathname === "/login" || pathname === "/register")) {
    const redirectPath = session.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
