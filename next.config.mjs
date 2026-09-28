// Every photo URL is built from this at build time; without it the site ships with "undefined/…" images,
// so refuse to build instead. PHOTO_BASE_URL is accepted too because Vercel won't mark NEXT_PUBLIC_* sensitive.
const photoBaseUrl = (process.env.NEXT_PUBLIC_PHOTO_BASE_URL || process.env.PHOTO_BASE_URL || "").replace(/\/$/, "");
if (!/^https?:\/\/\S+$/.test(photoBaseUrl)) {
  throw new Error(
    "Missing photo address: set NEXT_PUBLIC_PHOTO_BASE_URL (or PHOTO_BASE_URL) to the R2 bucket URL, e.g. https://pub-xxxx.r2.dev"
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PHOTO_BASE_URL: photoBaseUrl,
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
