export interface WorkImage {
  src: string;
  alt: string;
}

export interface Work {
  slug: string;
  title: string;
  meta: string;
  cover: string;
  images: WorkImage[];
}

export const WORKS: Work[] = [
  {
    slug: "off-the-track",
    title: "Off The Track",
    meta: "Concert · Live Set 2026",
    cover: "/work/off-the-track-featured.jpg",
    images: [
      { src: "/work/off-the-track-featured.jpg", alt: "Off The Track — pit shot from the live set" },
      { src: "/work/off-the-track.jpg", alt: "Off The Track — crowd shot" },
    ],
  },
  {
    slug: "graduation-season",
    title: "Graduation Season",
    meta: "Graduation",
    cover: "/work/graduation-season.jpg",
    images: [
      { src: "/work/graduation-season.jpg", alt: "Graduation Season" },
    ],
  },
  {
    slug: "speaker-series",
    title: "Speaker Series",
    meta: "Talks",
    cover: "/work/speaker-series.jpg",
    images: [
      { src: "/work/speaker-series.jpg", alt: "Speaker Series" },
    ],
  },
  {
    slug: "hands-on-sessions",
    title: "Hands-On Sessions",
    meta: "Workshops",
    cover: "/work/hands-on-sessions.jpg",
    images: [
      { src: "/work/hands-on-sessions.jpg", alt: "Hands-On Sessions" },
    ],
  },
];

export function getWork(slug: string): Work | undefined {
  return WORKS.find((w) => w.slug === slug);
}
