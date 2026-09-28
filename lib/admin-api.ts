import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { parseSiteMode } from "@/lib/site-mode";

const REMOTE_REVALIDATE_TIMEOUT_MS = 5000;

export async function requireAdmin(): Promise<NextResponse | null> {
  // Backs up the middleware: the public deployment answers admin routes as if they don't exist.
  if (parseSiteMode(process.env.SITE_MODE) === "public") return new NextResponse("Not found", { status: 404 });
  const token = cookies().get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token, process.env.ADMIN_SESSION_SECRET ?? "");
  return ok ? null : NextResponse.json({ error: "Not logged in" }, { status: 401 });
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// The public site is a separate Vercel deployment with its own cache, so it has to be told to refresh.
// A failure is only logged: the change is saved, and the public pages' hourly ISR catches up.
export async function revalidateSite(): Promise<void> {
  revalidatePath("/", "layout");
  const publicUrl = process.env.PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!publicUrl || !secret) return;
  try {
    const res = await fetch(`${publicUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(REMOTE_REVALIDATE_TIMEOUT_MS),
    });
    if (!res.ok) console.error(`Public site revalidation failed: HTTP ${res.status}`);
  } catch (err) {
    console.error("Public site revalidation failed:", err);
  }
}
