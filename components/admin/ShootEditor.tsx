"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ERROR_TOAST_MS } from "@/components/admin/toasts";
import { liveNote } from "@/lib/admin-messages";
import { resolveEventCover, type EventManifest } from "@/lib/manifest";
import { photoKey } from "@/lib/photo-keys";

interface ShootEditorProps {
  genre: string;
  event: string;
  manifest: EventManifest;
}

const small = "focus-ring font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-40";

export default function ShootEditor({ genre, event, manifest }: ShootEditorProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const coverId = resolveEventCover(manifest);

  // Resolves to whether the change is already live on the portfolio, or null when it failed (already toasted).
  async function call(method: string, url: string, body: unknown, failure: string): Promise<boolean | null> {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; live?: boolean };
      if (!res.ok) {
        toast.error(failure, { description: data.error ?? `Request failed (${res.status})`, duration: ERROR_TOAST_MS });
        return null;
      }
      return data.live ?? false;
    } catch (err) {
      toast.error(failure, { description: err instanceof Error ? err.message : String(err), duration: ERROR_TOAST_MS });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {manifest.photos.map((p) => (
          <li key={p.id}>
            <div className="relative aspect-square overflow-hidden bg-line">
              <Image src={photoKey(genre, event, p.id)} alt={p.id} fill sizes="240px" className="object-cover" />
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-ink/60">
              {p.id}
              {p.id === coverId && " · cover"}
              {p.hidden && " · not in gallery"}
            </p>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                disabled={busy || p.id === coverId}
                className={small}
                onClick={async () => {
                  const live = await call("PATCH", "/api/admin/cover", { genre, event, id: p.id }, "Couldn't change the cover");
                  if (live === null) return;
                  toast.success("Cover updated", { description: liveNote(live) });
                  router.refresh();
                }}
              >
                Set as cover
              </button>
              <button
                type="button"
                disabled={busy}
                className={`${small} text-red-700`}
                onClick={async () => {
                  if (!window.confirm(`Delete ${p.id}? This can't be undone.`)) return;
                  const live = await call("DELETE", "/api/admin/photos", { genre, event, id: p.id }, `Couldn't delete ${p.id}`);
                  if (live === null) return;
                  toast.success("Photo deleted", { description: liveNote(live) });
                  router.refresh();
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-16 border-t border-line pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">Delete this shoot</p>
        <p className="mt-2 text-sm text-ink/60">
          Removes every photo in it for good. Type <span className="font-mono">{event}</span> to confirm.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="focus-ring border border-line bg-paper px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            disabled={busy || confirmText !== event}
            className="focus-ring bg-red-700 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-40"
            onClick={async () => {
              const live = await call("DELETE", "/api/admin/events", { genre, event }, "Couldn't delete the shoot");
              if (live === null) return;
              // The toaster lives in the admin layout, so this survives the navigation back to the overview.
              toast.success(`Shoot "${manifest.title}" deleted`, { description: liveNote(live) });
              router.push("/admin");
              router.refresh();
            }}
          >
            Delete shoot
          </button>
        </div>
      </div>
    </div>
  );
}
