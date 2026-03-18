import { z } from "zod";

import { jsonOk, withErrorHandler } from "@/lib/api";

const visitSchema = z.object({
  pathname: z.string().min(1).max(200),
});

export const POST = withErrorHandler(async (request) => {
  visitSchema.parse(await request.json());

  return jsonOk({ ok: true });
});
