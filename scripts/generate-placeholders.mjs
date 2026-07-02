import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "work");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "off-the-track.jpg", label: "OFF THE TRACK", w: 1200, h: 800 },
  { file: "graduation-season.jpg", label: "GRADUATION SEASON", w: 1200, h: 800 },
  { file: "speaker-series.jpg", label: "SPEAKER SERIES", w: 1200, h: 800 },
  { file: "hands-on-sessions.jpg", label: "HANDS-ON SESSIONS", w: 1200, h: 800 },
  { file: "off-the-track-featured.jpg", label: "OFF THE TRACK — FEATURED", w: 2400, h: 1350 },
];

for (const { file, label, w, h } of targets) {
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stop-color="#A8B37E" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#FAF9F6" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <rect width="${w}" height="${h}" fill="none" stroke="#111110" stroke-opacity="0.12" stroke-width="2"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="monospace" font-size="${Math.round(w / 28)}" letter-spacing="4"
        fill="#111110" fill-opacity="0.55">${label}</text>
    </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(path.join(outDir, file));
  console.log(`wrote ${file}`);
}
