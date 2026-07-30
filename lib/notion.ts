import { Client } from "@notionhq/client";

function getClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error("notion: NOTION_API_KEY is not set");
  return new Client({ auth: apiKey });
}

function getDatabaseId() {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) throw new Error("notion: NOTION_DATABASE_ID is not set");
  return id;
}

export type BookingRecord = {
  name: string;
  email: string;
  phone: string;
  referral: string;
  purpose: string;
  details?: string;
  date?: string; // YYYY-MM-DD, omitted if the client had no specific date
};

/** Creates a Pending booking page in the Notion database. Returns the new page's ID. */
export async function createBookingPage(booking: BookingRecord): Promise<string> {
  const notion = getClient();
  const page = await notion.pages.create({
    parent: { database_id: getDatabaseId() },
    properties: {
      Name: { title: [{ text: { content: booking.name } }] },
      Email: { email: booking.email },
      Phone: { phone_number: booking.phone },
      Referral: { rich_text: [{ text: { content: booking.referral } }] },
      Purpose: { rich_text: [{ text: { content: booking.purpose } }] },
      Details: { rich_text: [{ text: { content: booking.details ?? "" } }] },
      ...(booking.date ? { Date: { date: { start: booking.date } } } : {}),
      Status: { select: { name: "Pending" } },
    },
  });
  return page.id;
}

/** Flips a booking page's Status once Wilson accepts or declines it in Discord. */
export async function updateBookingStatus(
  pageId: string,
  status: "Confirmed" | "Declined"
): Promise<void> {
  const notion = getClient();
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  });
}
