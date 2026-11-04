"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote } from "@/lib/admin-messages";

export default function NewPresetForm() {
  const router = useRouter();
  const { busy, call } = useAdminCall();
  const [name, setName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await call("POST", "/api/admin/presets", { name }, "Couldn't create the preset");
    if (!r) return;
    toast.success(`Preset "${name.trim()}" created`, { description: liveNote(r.live) });
    setName("");
    router.push(`/admin/presets/${String(r.data.slug)}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">New preset</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pit Red" className="focus-ring border border-line bg-paper px-3 py-2" required />
      </label>
      <button type="submit" disabled={busy} className="focus-ring bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50">
        + Add
      </button>
    </form>
  );
}
