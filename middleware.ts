import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { parseSiteMode, routeDecision } from "@/lib/site-mode";

const LOGIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return NextResponse.next();
  const decision = routeDecision(parseSiteMode(process.env.SITE_MODE), pathname);

  if (decision === "allow") return NextResponse.next();
  if (decision === "not-found") return new NextResponse("Not found", { status: 404 });
  if (decision === "to-admin") return NextResponse.redirect(new URL("/admin", req.url));

  if (LOGIN_PATHS.has(pathname)) return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET ?? "");
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
