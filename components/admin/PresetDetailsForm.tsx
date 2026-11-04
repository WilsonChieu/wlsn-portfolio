"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote } from "@/lib/admin-messages";
import type { Preset } from "@/lib/presets";

const input = "focus-ring border border-line bg-paper px-3 py-2";
const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50";

export default function PresetDetailsForm({ preset }: { preset: Preset }) {
  const router = useRouter();
  const { busy, call } = useAdminCall();
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description);
  const [price, setPrice] = useState(preset.price);
  const [buyUrl, setBuyUrl] = useState(preset.buyUrl ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await call("PATCH", `/api/admin/presets/${preset.slug}`, { name, description, price, buyUrl }, "Couldn't save the preset");
    if (!r) return;
    toast.success("Preset saved", { description: liveNote(r.live) });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className={label}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Price</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="RM 29" className={input} required />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className={label}>Short description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Deep reds and clean skin tones for concert pits." className={input} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className={label}>Gumroad link (blank = coming soon)</span>
        <input value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} placeholder="https://…gumroad.com/l/…" className={input} />
      </label>
      <button type="submit" disabled={busy} className="focus-ring self-start bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50">
        Save details
      </button>
    </form>
  );
}
