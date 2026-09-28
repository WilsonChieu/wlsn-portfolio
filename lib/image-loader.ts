import { pickVariantWidth, variantKey } from "@/lib/photo-keys";

export default function photoLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (src.startsWith("/") || /^https?:\/\//.test(src)) return src;
  return `${process.env.NEXT_PUBLIC_PHOTO_BASE_URL}/${variantKey(src, pickVariantWidth(width))}`;
}
