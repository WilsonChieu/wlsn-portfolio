"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PresetPhotoTile from "@/components/admin/PresetPhotoTile";
import { showToast } from "@/components/admin/toasts";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote, uploadSummary } from "@/lib/admin-messages";
import { presetPhotoIds, presetPhotoKey, type Preset } from "@/lib/presets";
import { ACCEPTED_FILE, filesFromDataTransfer, filesFromInput } from "@/lib/upload/collect-files";
import { uploadPresetPhotos } from "@/lib/upload/upload-preset";

export default function PresetCollage({ preset }: { preset: Preset }) {
  const router = useRouter();
  const { busy, call } = useAdminCall();
  const [progress, setProgress] = useState<string | null>(null);

  async function upload(files: File[]) {
    const photos = files.filter((f) => ACCEPTED_FILE.test(f.name));
    if (!photos.length) return toast.error("No photos found in what you dropped");
    let done = 0;
    setProgress(`Uploading 0 / ${photos.length}…`);
    const { uploaded, failed } = await uploadPresetPhotos(preset.slug, photos, new Set(presetPhotoIds(preset)), (_f, s) => {
      if (s.state === "uploading") setProgress(`Uploading ${++done} / ${photos.length}…`);
    });
    let added = 0;
    let missing = failed;
    let live = false;
    if (uploaded.length) {
      const r = await call("POST", `/api/admin/presets/${preset.slug}/photos`, { collage: uploaded.map((u) => u.photo) }, "Couldn't add the photos");
      if (r) {
        const lost = (r.data.missing as string[]).length;
        added = uploaded.length - lost;
        missing += lost;
        live = r.live;
      } else missing += uploaded.length;
    }
    setProgress(null);
    showToast(uploadSummary({ added, failed: missing, shootTitle: preset.name, live }));
    router.refresh();
  }

  async function edit(method: string, body: unknown, ok: string, failure: string) {
    const r = await call(method, `/api/admin/presets/${preset.slug}/photos`, body, failure);
    if (!r) return;
    if (method === "DELETE") toast.success(ok, { description: liveNote(r.live) });
    router.refresh();
  }

  return (
    <section>
      <h2 className="font-display text-2xl font-bold uppercase">Collage</h2>
      <p className="mt-1 text-sm text-ink/60">Photos edited with this preset (6–9 look best).</p>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          upload((await filesFromDataTransfer(e.dataTransfer)).map((p) => p.file));
        }}
        className="focus-ring mt-4 flex cursor-pointer flex-col items-center border border-dashed border-ink/40 px-6 py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
      >
        {progress ?? "Drop photos here or click to choose"}
        <input
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          disabled={progress !== null}
          onChange={(e) => {
            if (e.target.files?.length) upload(filesFromInput(e.target.files).map((p) => p.file));
            e.target.value = "";
          }}
        />
      </label>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {preset.collage.map((c, i) => (
          <PresetPhotoTile
            key={c.id}
            srcs={[{ key: presetPhotoKey(preset.slug, c.id) }]}
            busy={busy}
            first={i === 0}
            last={i === preset.collage.length - 1}
            onMove={(delta) => edit("PATCH", { id: c.id, move: delta }, "", "Couldn't move the photo")}
            onDelete={() => window.confirm("Delete this photo? This can't be undone.") && edit("DELETE", { id: c.id }, "Photo deleted", "Couldn't delete the photo")}
          />
        ))}
      </ul>
    </section>
  );
}
