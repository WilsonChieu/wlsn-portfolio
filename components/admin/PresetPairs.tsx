"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PresetPhotoTile from "@/components/admin/PresetPhotoTile";
import { ERROR_TOAST_MS } from "@/components/admin/toasts";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote } from "@/lib/admin-messages";
import { guessPairOrder, presetPhotoIds, presetPhotoKey, type Preset } from "@/lib/presets";
import { ACCEPTED_FILE, filesFromDataTransfer, filesFromInput } from "@/lib/upload/collect-files";
import { uploadPresetPhotos } from "@/lib/upload/upload-preset";

export default function PresetPairs({ preset }: { preset: Preset }) {
  const router = useRouter();
  const { busy, call } = useAdminCall();
  const [progress, setProgress] = useState<string | null>(null);

  async function upload(all: File[]) {
    const files = all.filter((f) => ACCEPTED_FILE.test(f.name));
    if (files.length !== 2) {
      toast.error("Drop exactly two photos: the before and the after", { duration: ERROR_TOAST_MS });
      return;
    }
    const [b, a] = guessPairOrder([files[0].name, files[1].name]);
    const ordered = [files[b], files[a]];
    setProgress("Uploading the pair…");
    const { uploaded } = await uploadPresetPhotos(preset.slug, ordered, new Set(presetPhotoIds(preset)), () => {});
    setProgress(null);
    const before = uploaded.find((u) => u.file === ordered[0])?.photo;
    const after = uploaded.find((u) => u.file === ordered[1])?.photo;
    if (!before || !after) {
      toast.error("The pair didn't upload", { description: "Try again — nothing was added", duration: ERROR_TOAST_MS });
      return;
    }
    const r = await call("POST", `/api/admin/presets/${preset.slug}/photos`, { pair: { before, after } }, "Couldn't add the pair");
    if (!r) return;
    toast.success("Before/after added", { description: liveNote(r.live) });
    router.refresh();
  }

  async function edit(method: string, body: unknown, ok: string | null, failure: string) {
    const r = await call(method, `/api/admin/presets/${preset.slug}/photos`, body, failure);
    if (!r) return;
    if (ok) toast.success(ok, { description: liveNote(r.live) });
    router.refresh();
  }

  return (
    <section>
      <h2 className="font-display text-2xl font-bold uppercase">Before / after</h2>
      <p className="mt-1 text-sm text-ink/60">Drop two photos at a time. Names with “before” / “after” are sorted for you; otherwise the first is the before.</p>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          upload((await filesFromDataTransfer(e.dataTransfer)).map((p) => p.file));
        }}
        className="focus-ring mt-4 flex cursor-pointer flex-col items-center border border-dashed border-ink/40 px-6 py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
      >
        {progress ?? "Drop a before + after pair here or click to choose"}
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
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {preset.pairs.map((pair, i) => (
          <PresetPhotoTile
            key={pair.after.id}
            srcs={[
              { key: presetPhotoKey(preset.slug, pair.before.id), label: "Before" },
              { key: presetPhotoKey(preset.slug, pair.after.id), label: "After" },
            ]}
            busy={busy}
            first={i === 0}
            last={i === preset.pairs.length - 1}
            onMove={(delta) => edit("PATCH", { id: pair.after.id, move: delta }, null, "Couldn't move the pair")}
            onSwap={() => edit("PATCH", { id: pair.after.id, swap: true }, "Swapped before and after", "Couldn't swap")}
            onDelete={() => window.confirm("Delete this before/after pair? This can't be undone.") && edit("DELETE", { id: pair.after.id }, "Pair deleted", "Couldn't delete the pair")}
          />
        ))}
      </ul>
    </section>
  );
}
