"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminCall } from "@/components/admin/useAdminCall";
import { liveNote } from "@/lib/admin-messages";

export default function PresetDanger({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const { busy, call } = useAdminCall();
  const [text, setText] = useState("");

  return (
    <div className="border-t border-line pt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">Delete this preset</p>
      <p className="mt-2 text-sm text-ink/60">
        Removes it from the page and deletes all its photos. Type <span className="font-mono">{slug}</span> to confirm.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <input value={text} onChange={(e) => setText(e.target.value)} className="focus-ring border border-line bg-paper px-3 py-2 font-mono text-sm" />
        <button
          type="button"
          disabled={busy || text !== slug}
          className="focus-ring bg-red-700 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-40"
          onClick={async () => {
            const r = await call("DELETE", `/api/admin/presets/${slug}`, undefined, "Couldn't delete the preset");
            if (!r) return;
            toast.success(`Preset "${name}" deleted`, { description: liveNote(r.live) });
            router.push("/admin/presets");
            router.refresh();
          }}
        >
          Delete preset
        </button>
      </div>
    </div>
  );
}
