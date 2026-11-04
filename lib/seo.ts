import type { Metadata } from "next";

export const SITE_URL = "https://www.wilsonchieu.com";
export const SITE_NAME = "CRISPTAKES";
export const PHOTOGRAPHER_NAME = "Wilson";
export const SERVICE_AREAS = ["Kuala Lumpur", "Seremban"];
export const SITE_DESCRIPTION = "Event, concert and graduation photographer in Kuala Lumpur and Seremban. Explore Wilson's CRISPTAKES portfolio and book a shoot on WhatsApp.";

export function pageUrl(...segments: string[]): string {
  return `${SITE_URL}/${segments.map(encodeURIComponent).join("/")}`;
}

export function pageMetadata(title: string, description: string, path: string, image?: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url: path, images: [{ url: image || `${SITE_URL}/opengraph-image.png`, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image || `${SITE_URL}/opengraph-image.png`] },
  };
}

export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })) };
}
