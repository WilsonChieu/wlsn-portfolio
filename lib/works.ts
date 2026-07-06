import fs from "fs";
import path from "path";

const WORK_DIR = path.join(process.cwd(), "public", "work");
const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif)$/i;
const COVER_NAMES = ["cover.jpg", "cover.jpeg", "cover.png", "cover.webp"];

function findExplicitCover(dir: string, urlBase: string): string {
  for (const name of COVER_NAMES) {
    if (fs.existsSync(path.join(dir, name))) return `${urlBase}/${name}`;
  }
  return "";
}

const GENRE_LABELS: Record<string, { title: string; meta: string }> = {
  concerts:   { title: "Concerts",   meta: "Live Sets"      },
  graduation: { title: "Graduation", meta: "Graduation"     },
  talks:      { title: "Talks",      meta: "Speaker Series" },
  workshops:  { title: "Workshops",  meta: "Workshops"      },
};

export interface WorkImage {
  src: string;
  alt: string;
}

export interface WorkEvent {
  slug: string;
  title: string;
  genreSlug: string;
  cover: string;
  images: WorkImage[];
}

export interface WorkGenre {
  slug: string;
  title: string;
  meta: string;
  cover: string;
  events: WorkEvent[];
}

function toTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getGenres(): WorkGenre[] {
  if (!fs.existsSync(WORK_DIR)) return [];

  return fs
    .readdirSync(WORK_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((genreDir) => {
      const genreSlug = genreDir.name;
      const genrePath = path.join(WORK_DIR, genreSlug);

      const events: WorkEvent[] = fs
        .readdirSync(genrePath, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((eventDir) => {
          const eventSlug = eventDir.name;
          const eventPath = path.join(genrePath, eventSlug);

          const explicitEventCover = findExplicitCover(
            eventPath,
            `/work/${genreSlug}/${eventSlug}`
          );

          const images: WorkImage[] = fs
            .readdirSync(eventPath)
            .filter((f) => IMAGE_EXTS.test(f) && !COVER_NAMES.includes(f.toLowerCase()))
            .sort()
            .map((f) => ({
              src: `/work/${genreSlug}/${eventSlug}/${f}`,
              alt: `${toTitle(eventSlug)} — ${f.replace(IMAGE_EXTS, "")}`,
            }));

          return {
            slug: eventSlug,
            title: toTitle(eventSlug),
            genreSlug,
            cover: explicitEventCover || images[0]?.src || "",
            images,
          };
        });

      const label = GENRE_LABELS[genreSlug] ?? {
        title: toTitle(genreSlug),
        meta: toTitle(genreSlug),
      };

      const explicitGenreCover = findExplicitCover(genrePath, `/work/${genreSlug}`);

      return {
        slug: genreSlug,
        title: label.title,
        meta: label.meta,
        cover: explicitGenreCover || events[0]?.cover || "",
        events,
      };
    });
}

export function getGenre(slug: string): WorkGenre | undefined {
  return getGenres().find((g) => g.slug === slug);
}

export function getEvent(genreSlug: string, eventSlug: string): WorkEvent | undefined {
  return getGenre(genreSlug)?.events.find((e) => e.slug === eventSlug);
}
