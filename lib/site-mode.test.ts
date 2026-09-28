import { describe, expect, it } from "vitest";
import { parseSiteMode, routeDecision } from "@/lib/site-mode";

describe("parseSiteMode", () => {
  it("recognises admin and all", () => {
    expect(parseSiteMode("admin")).toBe("admin");
    expect(parseSiteMode("all")).toBe("all");
  });
  it.each([undefined, "", "public", "Admin", "ADMIN", " admin", "yes"])("falls back to public for %j", (value) => {
    expect(parseSiteMode(value)).toBe("public");
  });
});

describe("routeDecision", () => {
  const adminPaths = ["/admin", "/admin/", "/admin/login", "/admin/concerts/off-the-track", "/api/admin/login", "/api/admin/uploads"];
  const publicPaths = ["/", "/work/concerts", "/work/concerts/off-the-track", "/administrator", "/api/adminx"];

  it.each(adminPaths)("public mode hides admin path %s", (path) => {
    expect(routeDecision("public", path)).toBe("not-found");
  });
  it.each(publicPaths)("public mode serves %s", (path) => {
    expect(routeDecision("public", path)).toBe("allow");
  });

  it.each(adminPaths)("admin mode guards admin path %s behind the session", (path) => {
    expect(routeDecision("admin", path)).toBe("admin-auth");
  });
  it.each(publicPaths)("admin mode sends %s to the admin", (path) => {
    expect(routeDecision("admin", path)).toBe("to-admin");
  });

  it.each(adminPaths)("all mode guards admin path %s behind the session", (path) => {
    expect(routeDecision("all", path)).toBe("admin-auth");
  });
  it.each(publicPaths)("all mode serves %s", (path) => {
    expect(routeDecision("all", path)).toBe("allow");
  });

  it.each(["public", "admin", "all"] as const)("always lets %s mode reach the revalidate hook", (mode) => {
    expect(routeDecision(mode, "/api/revalidate")).toBe("allow");
  });
});
