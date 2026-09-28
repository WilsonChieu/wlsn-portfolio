import { NextResponse } from "next/server";
import { readBody } from "@/lib/admin-api";
import {
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isStrongPassword,
  passwordMatches,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const FAILED_LOGIN_DELAY_MS = 1000;

export async function POST(req: Request) {
  const body = await readBody(req);
  const password =
    typeof body === "object" && body !== null && "password" in body && typeof body.password === "string"
      ? body.password
      : "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!secret || !expected) return NextResponse.json({ error: "Admin is not configured" }, { status: 500 });
  if (!isStrongPassword(expected)) {
    return NextResponse.json(
      { error: `Admin password is too short — set ADMIN_PASSWORD to at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 500 }
    );
  }

  if (!(await passwordMatches(password, expected, secret))) {
    await new Promise((r) => setTimeout(r, FAILED_LOGIN_DELAY_MS));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
