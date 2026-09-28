import { slugify } from "@/lib/slug";

export function shootNameProblems(titles: string[], existingSlugs: string[]): (string | null)[] {
  const existing = new Set(existingSlugs);
  const seen = new Set<string>();
  return titles.map((title) => {
    const slug = slugify(title);
    if (!slug) return "Needs a name with at least one letter or number";
    if (existing.has(slug)) return "A shoot with this name already exists — rename it, or add photos from that shoot's page";
    if (seen.has(slug)) return "Same name as another shoot in this upload — rename one of them";
    seen.add(slug);
    return null;
  });
}
