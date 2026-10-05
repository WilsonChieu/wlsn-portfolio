import type { WorkGenre } from "@/lib/works";

export interface ShootRef {
  genreSlug: string;
  eventSlug: string;
  title: string;
  cover: string;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function workSummary(genres: WorkGenre[]): string {
  const events = genres.reduce((sum, g) => sum + g.events.length, 0);
  return `${genres.length} ${genres.length === 1 ? "category" : "categories"} · ${plural(events, "event")}`;
}

const ref = (g: WorkGenre, i: number): ShootRef => ({
  genreSlug: g.slug,
  eventSlug: g.events[i].slug,
  title: g.events[i].title,
  cover: g.events[i].cover,
});

export function slideshowFrames(genres: WorkGenre[], max = 6): ShootRef[] {
  const frames: ShootRef[] = [];
  const longest = Math.max(0, ...genres.map((g) => g.events.length));
  for (let round = 0; round < longest && frames.length < max; round++) {
    for (const g of genres) {
      if (frames.length >= max) break;
      if (g.events[round]?.cover) frames.push(ref(g, round));
    }
  }
  return frames;
}

export function nextShoot(genres: WorkGenre[], genreSlug: string, eventSlug: string): ShootRef | null {
  const all = genres.flatMap((g) => g.events.map((_, i) => ref(g, i)));
  const at = all.findIndex((s) => s.genreSlug === genreSlug && s.eventSlug === eventSlug);
  if (at < 0 || all.length < 2) return null;
  return all[(at + 1) % all.length];
}

export function stepIndex(index: number, delta: number, count: number): number {
  return count > 0 ? (((index + delta) % count) + count) % count : 0;
}

export function photoIndex(photos: { id: string }[], id: string | null): number {
  return id ? photos.findIndex((p) => p.id === id) : -1;
}
