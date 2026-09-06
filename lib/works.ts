import fs from "fs";
import path from "path";

const WORK_DIR = path.join(process.cwd(), "public", "work");
const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif)$/i;
const COVER_NAMES = ["cover.jpg", "cover.jpeg", "cover.png", "cover.webp"];

function findExplicitCover(dir: string, urlBase: string): string {
  // Case-insensitive match against the real on-disk filename — a plain
  // existsSync(lowercase name) check silently misses files like cover.JPG
  // on Vercel's case-sensitive filesystem, even though it works locally
  // on case-insensitive Windows/macOS.
  const match = fs.readdirSync(dir).find((f) => COVER_NAMES.includes(f.toLowerCase()));
  return match ? `${urlBase}/${match}` : "";
}

function readImageDimensions(absPath: string): { width: number; height: number } | null {
  try {
    const buf = fs.readFileSync(absPath);
    if (buf.length < 24) return null;

    // PNG
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    // GIF
    if (buf.toString("ascii", 0, 3) === "GIF") {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }

    // JPEG — scan markers for the first Start-Of-Frame segment
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSOF) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
      }
      return null;
    }

    // WebP
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const format = buf.toString("ascii", 12, 16);
      if (format === "VP8 ") {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
      if (format === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (format === "VP8X") {
        const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
        const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
        return { width, height };
      }
    }

    return null;
  } catch {
    return null;
  }
}

const GENRE_LABELS: Record<string, { title: string; meta: string }> = {
  concerts:   { title: "Concerts",   meta: "Live Sets"      },
  graduation: { title: "Graduation", meta: "Graduation"     },
  events:      { title: "Events",      meta: "Event" },
};

export interface WorkImage {
  src: string;
  alt: string;
  width: number;
  height: number;
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
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
            .map((f) => {
              const dims = readImageDimensions(path.join(eventPath, f));
              return {
                src: `/work/${genreSlug}/${eventSlug}/${f}`,
                alt: `${toTitle(eventSlug)} — ${f.replace(IMAGE_EXTS, "")}`,
                width: dims?.width ?? 1200,
                height: dims?.height ?? 800,
              };
            });

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
