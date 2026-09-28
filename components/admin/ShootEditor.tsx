"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const coverId = resolveEventCover(manifest);

  async function call(method: string, url: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Failed (${res.status})`);
      return false;
    }
    return true;
  }

  return (
    <div className="mt-10">
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
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
                  if (await call("PATCH", "/api/admin/cover", { genre, event, id: p.id })) router.refresh();
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
                  if (await call("DELETE", "/api/admin/photos", { genre, event, id: p.id })) router.refresh();
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
              if (await call("DELETE", "/api/admin/events", { genre, event })) {
                router.push("/admin");
                router.refresh();
              }
            }}
          >
            Delete shoot
          </button>
        </div>
      </div>
    </div>
  );
}
