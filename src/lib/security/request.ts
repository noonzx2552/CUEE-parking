import { headers } from "next/headers";

export async function getRequestContext() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const userAgent = headerList.get("user-agent") || "unknown";

  return { ip, userAgent };
}
