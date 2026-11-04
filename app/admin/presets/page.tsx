import Link from "next/link";
import NewPresetForm from "@/components/admin/NewPresetForm";
import PresetOrder from "@/components/admin/PresetOrder";
import PresetSettings from "@/components/admin/PresetSettings";
import PresetVisibility from "@/components/admin/PresetVisibility";
import { bundleSaving, presetPhotoKey } from "@/lib/presets";
import { loadPresets } from "@/lib/presets-store";

export const dynamic = "force-dynamic";

export default async function AdminPresetsPage() {
  const m = await loadPresets();
  const rows = m.presets.map((p) => {
    const first = p.pairs[0]?.after ?? p.collage[0];
    return {
      slug: p.slug,
      name: p.name,
      price: p.price,
      hasLink: p.buyUrl !== null,
      collage: p.collage.length,
      pairs: p.pairs.length,
      thumb: first ? presetPhotoKey(p.slug, first.id) : null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">← Admin</Link>
      <h1 className="mt-4 font-display text-4xl font-bold uppercase">Presets</h1>
      <p className="mt-2 font-mono text-[11px] text-ink/50">
        {m.presets.length === 0 ? "Hidden on the portfolio until you add one" : <Link href="/presets" className="focus-ring underline">/presets</Link>}
      </p>
      <div className="mt-10">
        <PresetVisibility key={String(m.enabled)} enabled={m.enabled !== false} />
        <PresetSettings key={`${m.bundle.price}|${m.bundle.buyUrl}|${m.includes.join("\n")}`} bundle={m.bundle} includes={m.includes} saving={bundleSaving(m)} />
      </div>
      <div className="mt-14">
        <NewPresetForm />
        <PresetOrder rows={rows} />
      </div>
    </div>
  );
}
