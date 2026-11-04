"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote } from "@/lib/admin-messages";

export default function PresetVisibility({ enabled, slug }: { enabled: boolean; slug?: string }) {
  const [visible, setVisible] = useState(enabled);
  const router = useRouter();
  const { busy, call } = useAdminCall();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = await call("PATCH", slug ? `/api/admin/presets/${slug}` : "/api/admin/presets", { enabled: visible }, "Couldn't save visibility");
    if (!result) return;
    toast.success("Visibility saved", { description: liveNote(result.live) });
    router.refresh();
  }
  return <form onSubmit={save} className="mb-8 flex flex-wrap items-center gap-5 rounded-xl border border-line p-4"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={visible} disabled={busy} onChange={(event) => setVisible(event.target.checked)} className="h-5 w-5" />{slug ? "Show this preset on my website" : "Show presets on my website"}</label><button type="submit" disabled={busy} className="focus-ring min-h-11 rounded-full bg-ink px-5 text-sm text-paper disabled:opacity-50">{busy ? "Saving…" : "Save visibility"}</button></form>;
}
