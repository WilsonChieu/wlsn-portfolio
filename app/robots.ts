import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { parseSiteMode } from "@/lib/site-mode";

export default function robots(): MetadataRoute.Robots {
  if (parseSiteMode(process.env.SITE_MODE) === "admin") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
