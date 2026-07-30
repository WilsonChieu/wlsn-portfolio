import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createBookingPage } from "@/lib/notion";
import { sendBookingApprovalMessage } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, referral, purpose, details, date } = body as Record<string, string>;

  if (!name || !email || !phone || !referral || !purpose) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const booking = { name, email, phone, referral, purpose, details, date: date || undefined };

  // Notion is now the source of truth for a booking's status, and the
  // Discord message's Accept/Decline buttons only make sense once that page
  // exists (they carry its ID). Both are load-bearing for the actual
  // approval workflow, so unlike the emails below, a failure here is a real
  // error — there's nothing sensible to fall back to.
  let pageId: string;
  try {
    pageId = await createBookingPage(booking);
  } catch (err) {
    console.error("booking: failed to create Notion page", err);
    return NextResponse.json({ error: "Failed to save booking" }, { status: 502 });
  }

  try {
    await sendBookingApprovalMessage({ pageId, ...booking });
  } catch (err) {
    console.error("booking: failed to send Discord approval message", err);
    return NextResponse.json({ error: "Failed to notify" }, { status: 502 });
  }

  // Emails are supplementary now that Discord + Notion are the primary
  // workflow — send both, but don't fail the request if only these fail;
  // the booking is already safely recorded and Wilson's already been
  // notified in Discord by this point.
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const notifyEmail = process.env.BOOKING_NOTIFY_EMAIL;

  if (resendApiKey && fromEmail && notifyEmail) {
    const resend = new Resend(resendApiKey);
    const detailLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Referred by: ${referral}`,
      `Purpose: ${purpose}`,
      `Date requested: ${date || "No specific date"}`,
    ];
    if (details) detailLines.push(`Details: ${details}`);

    const [notifyResult, confirmResult] = await Promise.allSettled([
      resend.emails.send({
        from: fromEmail,
        to: notifyEmail,
        replyTo: email,
        subject: `New booking inquiry — ${name}`,
        text: ["New booking inquiry via wlsn-portfolio.vercel.app", "", ...detailLines].join("\n"),
      }),
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Got your inquiry — WLSN",
        text: [
          `Hi ${name},`,
          "",
          "Thanks for reaching out — this confirms I've received your booking inquiry.",
          "It's pending my review; I'll follow up within 48 hours to confirm.",
          "",
          "Here's what you sent:",
          ...detailLines,
          "",
          "— Wilson",
        ].join("\n"),
      }),
    ]);

    if (notifyResult.status === "rejected") {
      console.error("booking: notification email failed", notifyResult.reason);
    }
    if (confirmResult.status === "rejected") {
      console.error("booking: confirmation email failed", confirmResult.reason);
    }
  }

  // CallMeBot: optional, best-effort, on top of everything above.
  const callMeBotPhone = process.env.CALLMEBOT_PHONE;
  const callMeBotKey = process.env.CALLMEBOT_API_KEY;
  if (callMeBotPhone && callMeBotKey) {
    const message = [
      "New booking inquiry — WLSN",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Purpose: ${purpose}`,
    ].join("\n");
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
      callMeBotPhone
    )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callMeBotKey)}`;
    try {
      await fetch(url);
    } catch (err) {
      console.error("booking: callmebot notification failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
