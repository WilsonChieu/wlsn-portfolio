"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGenreForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meta }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not create category");
      return;
    }
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
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
