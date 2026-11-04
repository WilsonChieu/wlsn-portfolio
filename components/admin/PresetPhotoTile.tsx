"use client";

import Image from "next/image";

const small = "focus-ring font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-30";

interface Props {
  srcs: { key: string; label?: string }[];
  busy: boolean;
  first: boolean;
  last: boolean;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  onSwap?: () => void;
}

export default function PresetPhotoTile({ srcs, busy, first, last, onMove, onDelete, onSwap }: Props) {
  return (
    <li>
      <div className={`grid gap-1 ${srcs.length > 1 ? "grid-cols-2" : ""}`}>
        {srcs.map((s) => (
          <div key={s.key}>
            <div className="relative aspect-square overflow-hidden bg-line">
              <Image src={s.key} alt="" fill sizes="200px" className="object-cover" />
            </div>
            {s.label && <p className="mt-1 font-mono text-[10px] uppercase text-ink/50">{s.label}</p>}
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-3">
        <button type="button" disabled={busy || first} onClick={() => onMove(-1)} className={small} aria-label="Move earlier">←</button>
        <button type="button" disabled={busy || last} onClick={() => onMove(1)} className={small} aria-label="Move later">→</button>
        {onSwap && <button type="button" disabled={busy} onClick={onSwap} className={small}>Swap</button>}
        <button type="button" disabled={busy} onClick={onDelete} className={`${small} text-red-700`}>Delete</button>
      </div>
    </li>
  );
}
