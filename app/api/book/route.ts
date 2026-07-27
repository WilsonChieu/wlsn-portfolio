import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, referral, purpose, details } = body as Record<string, string>;

  if (!name || !phone || !referral || !purpose) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const wilsonPhone = process.env.CALLMEBOT_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!wilsonPhone || !apiKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const lines = [
    "New booking inquiry — WLSN",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Referred by: ${referral}`,
    `Purpose: ${purpose}`,
  ];
  if (details) lines.push(`Details: ${details}`);
  const message = lines.join("\n");

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    wilsonPhone
  )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
