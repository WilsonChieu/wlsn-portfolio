"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ERROR_TOAST_MS } from "@/components/admin/toasts";
import { liveNote } from "@/lib/admin-messages";

export default function NewGenreForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meta }),
    }).catch(() => null);
    setBusy(false);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as { error?: string; live?: boolean };
    if (!res?.ok) {
      toast.error("Couldn't create the category", {
        description: data.error ?? "Check your connection and try again",
        duration: ERROR_TOAST_MS,
      });
      return;
    }
    toast.success(`Category "${title.trim()}" created`, { description: liveNote(data.live ?? false) });
    setTitle("");
    setMeta("");
    router.refresh();
  }

  const input = "focus-ring border border-line bg-paper px-3 py-2";
  const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50";

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className={label}>New category</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weddings" className={input} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Short label (optional)</span>
        <input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Wedding" className={input} />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="focus-ring bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50"
      >
        + Add
      </button>
    </form>
  );
}
