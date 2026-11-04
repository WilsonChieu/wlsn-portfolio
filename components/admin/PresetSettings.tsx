"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote } from "@/lib/admin-messages";

const input = "focus-ring border border-line bg-paper px-3 py-2";
const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50";
const submit = "focus-ring bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50";

export default function PresetSettings({ bundle, includes, saving }: { bundle: { price: string; buyUrl: string | null }; includes: string[]; saving: string | null }) {
  const router = useRouter();
  const { busy, call } = useAdminCall();
  const [price, setPrice] = useState(bundle.price);
  const [buyUrl, setBuyUrl] = useState(bundle.buyUrl ?? "");
  const [lines, setLines] = useState(includes.join("\n"));

  async function saveBundle(e: React.FormEvent) {
    e.preventDefault();
    const r = await call("PATCH", "/api/admin/presets", { bundle: { price, buyUrl } }, "Couldn't save the bundle");
    if (!r) return;
    toast.success("Bundle saved", { description: liveNote(r.live) });
    router.refresh();
  }

  async function saveIncludes(e: React.FormEvent) {
    e.preventDefault();
    const r = await call("PATCH", "/api/admin/presets", { includes: lines.split("\n") }, "Couldn't save the list");
    if (!r) return;
    toast.success("“What you get” saved", { description: liveNote(r.live) });
    router.refresh();
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <form onSubmit={saveBundle} className="flex flex-col gap-3">
        <p className={label}>Bundle (all presets){saving ? ` · buyers save ${saving}` : ""}</p>
        <label className="flex flex-col gap-1">
          <span className={label}>Price</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="RM 69" className={input} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Gumroad link (blank = coming soon)</span>
          <input value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} placeholder="https://…gumroad.com/l/…" className={input} />
        </label>
        <button type="submit" disabled={busy} className={`${submit} self-start`}>Save bundle</button>
      </form>
      <form onSubmit={saveIncludes} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className={label}>What you get (one per line)</span>
          <textarea value={lines} onChange={(e) => setLines(e.target.value)} rows={5} className={input} />
        </label>
        <button type="submit" disabled={busy} className={`${submit} self-start`}>Save list</button>
      </form>
    </div>
  );
}
