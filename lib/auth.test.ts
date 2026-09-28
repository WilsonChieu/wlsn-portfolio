import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  SESSION_TTL_SECONDS,
  bearerMatches,
  createSessionToken,
  isStrongPassword,
  passwordMatches,
  verifySessionToken,
} from "@/lib/auth";

const SECRET = "test-secret-please-ignore";
const NOW = 1_800_000_000_000;

describe("session tokens", () => {
  it("accepts a fresh token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000 + 1)).toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("other", NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects a token whose expiry was edited", async () => {
    const [, sig] = (await createSessionToken(SECRET, NOW)).split(".");
    expect(await verifySessionToken(`9999999999.${sig}`, SECRET, NOW)).toBe(false);
  });

  it.each([undefined, "", "abc", "1.2.3", "x.y", ".", "123."])("rejects malformed %j", async (token) => {
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects everything when the secret is missing", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, "", NOW)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("matches only the exact password", async () => {
    expect(await passwordMatches("hunter2", "hunter2", SECRET)).toBe(true);
    expect(await passwordMatches("hunter3", "hunter2", SECRET)).toBe(false);
    expect(await passwordMatches("", "hunter2", SECRET)).toBe(false);
  });
  it("never matches when no password is configured", async () => {
    expect(await passwordMatches("", "", SECRET)).toBe(false);
  });
});

describe("isStrongPassword", () => {
  it("requires at least 16 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(16);
    expect(isStrongPassword("a".repeat(15))).toBe(false);
    expect(isStrongPassword("a".repeat(16))).toBe(true);
  });
  it("ignores surrounding whitespace when counting", () => {
    expect(isStrongPassword(" ".repeat(20))).toBe(false);
  });
});

describe("bearerMatches", () => {
  it("accepts the exact bearer secret", async () => {
    expect(await bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });
  it.each([null, "", SECRET, `Bearer ${SECRET}x`, `bearer ${SECRET}`, "Bearer ", `Basic ${SECRET}`])(
    "rejects %j",
    async (header) => {
      expect(await bearerMatches(header, SECRET)).toBe(false);
    }
  );
  it("rejects everything when no secret is configured", async () => {
    expect(await bearerMatches("Bearer ", "")).toBe(false);
    expect(await bearerMatches("Bearer anything", "")).toBe(false);
  });
});
