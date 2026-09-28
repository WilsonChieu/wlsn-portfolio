import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function requireAdmin(): Promise<NextResponse | null> {
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

export function revalidateSite(): void {
  revalidatePath("/", "layout");
}
