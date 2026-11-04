"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminCall } from "@/components/admin/useAdminCall";

interface Row {
  slug: string;
  name: string;
  price: string;
  hasLink: boolean;
  collage: number;
  pairs: number;
  thumb: string | null;
}

const small = "focus-ring font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-30";

export default function PresetOrder({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { busy, call } = useAdminCall();

  async function move(slug: string, delta: -1 | 1) {
    if (await call("PATCH", `/api/admin/presets/${slug}`, { move: delta }, "Couldn't reorder")) router.refresh();
  }

  if (rows.length === 0) return <p className="mt-6 text-sm text-ink/60">No presets yet — add the first one above.</p>;
  return (
    <ol className="mt-6 divide-y divide-line border-y border-line">
      {rows.map((r, i) => (
        <li key={r.slug} className="flex items-center gap-4 py-3">
          <span className="w-6 font-mono text-[11px] text-ink/50">{String(i + 1).padStart(2, "0")}</span>
          <div className="relative h-14 w-20 flex-none overflow-hidden bg-line">
            {r.thumb && <Image src={r.thumb} alt="" fill sizes="80px" className="object-cover" />}
          </div>
          <Link href={`/admin/presets/${r.slug}`} className="focus-ring flex-1">
            <p className="font-display text-lg font-bold uppercase">{r.name}</p>
            <p className="font-mono text-[10px] text-ink/50">
              {r.price} · {r.collage} collage · {r.pairs} before/after{r.hasLink ? "" : " · no Gumroad link yet"}
            </p>
          </Link>
          <button type="button" disabled={busy || i === 0} onClick={() => move(r.slug, -1)} className={small} aria-label={`Move ${r.name} up`}>↑</button>
          <button type="button" disabled={busy || i === rows.length - 1} onClick={() => move(r.slug, 1)} className={small} aria-label={`Move ${r.name} down`}>↓</button>
        </li>
      ))}
    </ol>
  );
}
