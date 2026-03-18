import QRCode from "qrcode";

import { requireSession } from "@/lib/auth/session";
import { withErrorHandler, jsonOk } from "@/lib/api";
import { generateReservationQr } from "@/lib/services/reservations";
import { reservationQrSchema } from "@/lib/validators/reservation";

export const GET = withErrorHandler(async (request, context) => {
  const session = await requireSession();
  const params = await context.params;
  const url = new URL(request.url);
  const query = reservationQrSchema.parse({
    mode: url.searchParams.get("mode") ?? undefined,
  });

  const qrPayload = await generateReservationQr({
    reservationId: params.id,
    actorUserId: session.id,
    isAdmin: session.role === "admin",
    mode: query.mode,
  });

  const accessUrl = `${url.origin}/scan?mode=${query.mode}&token=${encodeURIComponent(qrPayload.token)}`;
  const qrDataUrl = await QRCode.toDataURL(accessUrl, {
    margin: 1,
    width: 320,
  });

  return jsonOk({
    ...qrPayload,
    accessUrl,
    qrDataUrl,
  });
});
