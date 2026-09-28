export type SiteMode = "public" | "admin" | "all";

export type RouteDecision = "allow" | "not-found" | "to-admin" | "admin-auth";

const REVALIDATE_PATH = "/api/revalidate";

// Anything unrecognised is treated as the public site, so a missing or mistyped env var never exposes admin.
export function parseSiteMode(value: string | undefined): SiteMode {
  return value === "admin" || value === "all" ? value : "public";
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

export function routeDecision(mode: SiteMode, pathname: string): RouteDecision {
  if (pathname === REVALIDATE_PATH) return "allow";
  if (isAdminPath(pathname)) return mode === "public" ? "not-found" : "admin-auth";
  return mode === "admin" ? "to-admin" : "allow";
}
