export const SESSION_COOKIE = "wlsn_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const MIN_PASSWORD_LENGTH = 16;

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, nowMs = Date.now()): Promise<string> {
  const expiry = String(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  return `${expiry}.${await hmacHex(secret, expiry)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowMs = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiry, sig] = parts;
  if (!/^\d+$/.test(expiry) || !sig) return false;
  if (Number(expiry) * 1000 <= nowMs) return false;
  return safeEqual(sig, await hmacHex(secret, expiry));
}

// Comparing HMACs of both values keeps the comparison constant-length regardless of input length.
export async function passwordMatches(input: string, expected: string, secret: string): Promise<boolean> {
  if (!expected) return false;
  return safeEqual(await hmacHex(secret, input), await hmacHex(secret, expected));
}

export async function bearerMatches(authorization: string | null, secret: string): Promise<boolean> {
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  return passwordMatches(authorization.slice("Bearer ".length), secret, secret);
}

// The login page is public and the upload guard is the only thing between a guessed password and an R2 bill.
export function isStrongPassword(password: string): boolean {
  return password.trim().length >= MIN_PASSWORD_LENGTH;
}
