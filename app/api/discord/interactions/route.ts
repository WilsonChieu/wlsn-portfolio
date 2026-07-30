import { NextRequest, NextResponse } from "next/server";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import { updateBookingStatus } from "@/lib/notion";

/**
 * Discord POSTs every interaction (including a PING it uses just to verify
 * this URL when you first save it in the Developer Portal) to this route.
 * The raw request body must be read as text — not parsed as JSON first —
 * because the signature covers the exact bytes Discord sent; re-serializing
 * a parsed object can produce different bytes and fail verification.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return new NextResponse("missing signature headers", { status: 401 });
  }

  const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!isValid) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId: string = interaction.data.custom_id;
    const [action, pageId] = customId.split(":");

    if ((action === "accept" || action === "decline") && pageId) {
      const status = action === "accept" ? "Confirmed" : "Declined";
      try {
        await updateBookingStatus(pageId, status);
      } catch (err) {
        console.error("discord interaction: failed to update Notion", err);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "⚠️ Couldn't update Notion — check the page manually.", flags: 64 },
        });
      }

      const label = status === "Confirmed" ? "✅ Accepted" : "❌ Declined";
      return NextResponse.json({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: status === "Confirmed" ? 3 : 4,
                  label,
                  custom_id: "noop",
                  disabled: true,
                },
              ],
            },
          ],
        },
      });
    }
  }

  return new NextResponse("unhandled interaction", { status: 400 });
}
