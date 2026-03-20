import { jsonOk, withErrorHandler } from "@/lib/api";
import { attachLineUserToLatestSession } from "@/lib/services/smartpark";
import { pushLinePayload } from "@/lib/services/line";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request) => {
  const data = (await request.json()) as {
    slot?: string;
    user_id?: string;
    entrance_time?: string;
  };

  const slot = (data.slot ?? "").trim();
  const lineUserId = (data.user_id ?? "").trim();
  const entranceTime = (data.entrance_time ?? "").trim() || new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  if (!slot) {
    return jsonOk({ status: "error", message: "Slot is required." }, { status: 422 });
  }

  let linked = false;
  if (lineUserId) {
    linked = await attachLineUserToLatestSession(slot, lineUserId);
    await pushLinePayload(lineUserId, [
      {
        type: "flex",
        altText: "SmartPark E-Parking Ticket",
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#2563eb",
            contents: [
              { type: "text", text: "SMART PARK", color: "#ffffff", weight: "bold", size: "lg" },
              { type: "text", text: "E-Parking Ticket", color: "#dbeafe", size: "xs" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "Slot", color: "#6b7280", size: "sm" },
                  { type: "text", text: slot, align: "end", weight: "bold", size: "sm" },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "Entrance", color: "#6b7280", size: "sm" },
                  { type: "text", text: `${entranceTime} น.`, align: "end", weight: "bold", size: "sm" },
                ],
              },
            ],
          },
        },
      },
    ]);
  }

  return jsonOk({ status: "success", slot, line_linked: linked });
});
