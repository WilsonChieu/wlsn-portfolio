import pica from "pica";
import { JPEG_QUALITY, VARIANT_WIDTHS } from "@/lib/photo-keys";

export interface ProcessedPhoto {
  width: number;
  height: number;
  variants: { width: number; blob: Blob }[];
}

let resizer: ReturnType<typeof pica> | undefined;

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  resizer ??= pica();

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      /\.hei[cf]$/i.test(file.name) ? "HEIC photos only open in Safari — export as JPG" : "This browser can't read this file"
    );
  }

  try {
    const { width, height } = bitmap;
    const byTarget = new Map<number, Blob>();
    const variants: ProcessedPhoto["variants"] = [];
    for (const w of VARIANT_WIDTHS) {
      const target = Math.min(w, width);
      let blob = byTarget.get(target);
      if (!blob) {
        const canvas = document.createElement("canvas");
        canvas.width = target;
        canvas.height = Math.max(1, Math.round((height * target) / width));
        await resizer.resize(bitmap, canvas, { filter: "lanczos3" });
        blob = await resizer.toBlob(canvas, "image/jpeg", JPEG_QUALITY);
        // Zeroing the size frees the canvas memory immediately — iOS Safari caps total canvas memory.
        canvas.width = 0;
        canvas.height = 0;
        byTarget.set(target, blob);
      }
      variants.push({ width: w, blob });
    }
    return { width, height, variants };
  } finally {
    bitmap.close();
  }
}
