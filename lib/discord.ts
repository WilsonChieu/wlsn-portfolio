const DISCORD_API = "https://discord.com/api/v10";

// Discord component/style type codes — there's no public enum export for
// these in a lightweight form, so they're just documented here.
const ACTION_ROW = 1;
const BUTTON = 2;
const STYLE_SUCCESS = 3; // green
const STYLE_DANGER = 4; // red

export type BookingSummary = {
  pageId: string;
  name: string;
  email: string;
  phone: string;
  referral: string;
  purpose: string;
  details?: string;
  date?: string;
};

/**
 * Posts the booking as an embed with Accept/Decline buttons to the
 * configured channel. The booking's Notion page ID is embedded in each
 * button's custom_id ("accept:<pageId>" / "decline:<pageId>") — that's how
 * the interactions route below knows which page to update when clicked.
 */
export async function sendBookingApprovalMessage(booking: BookingSummary): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!botToken || !channelId) {
    throw new Error("discord: DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID is not set");
  }

  const fields = [
    { name: "Email", value: booking.email, inline: true },
    { name: "Phone", value: booking.phone, inline: true },
    { name: "Purpose", value: booking.purpose, inline: true },
    { name: "Referred by", value: booking.referral, inline: true },
    { name: "Date requested", value: booking.date ?? "No specific date", inline: true },
  ];
  if (booking.details) {
    fields.push({ name: "Details", value: booking.details, inline: false });
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          title: `New booking inquiry — ${booking.name}`,
          color: 0x7f8c4f, // --olive
          fields,
        },
      ],
      components: [
        {
          type: ACTION_ROW,
          components: [
            {
              type: BUTTON,
              style: STYLE_SUCCESS,
              label: "Accept",
              custom_id: `accept:${booking.pageId}`,
            },
            {
              type: BUTTON,
              style: STYLE_DANGER,
              label: "Decline",
              custom_id: `decline:${booking.pageId}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`discord: send message failed (${res.status}): ${body}`);
  }
}
