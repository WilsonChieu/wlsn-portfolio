import Link from "next/link";
import { notFound } from "next/navigation";
import PresetCollage from "@/components/admin/PresetCollage";
import PresetDanger from "@/components/admin/PresetDanger";
import PresetDetailsForm from "@/components/admin/PresetDetailsForm";
import PresetPairs from "@/components/admin/PresetPairs";
import PresetVisibility from "@/components/admin/PresetVisibility";
import { loadPresets } from "@/lib/presets-store";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function AdminPresetPage({ params }: { params: { preset: string } }) {
  if (!isSlug(params.preset)) notFound();
  const preset = (await loadPresets()).presets.find((p) => p.slug === params.preset);
  if (!preset) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/presets" className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">← All presets</Link>
      <h1 className="mt-4 font-display text-4xl font-bold uppercase">{preset.name}</h1>
      <p className="mt-2 font-mono text-[11px] text-ink/50">
        <Link href={`/presets#${preset.slug}`} className="focus-ring underline">/presets#{preset.slug}</Link>
      </p>
      <div className="mt-8"><PresetDetailsForm key={`${preset.name}|${preset.price}|${preset.buyUrl}|${preset.description}`} preset={preset} /></div>
      <PresetVisibility key={String(preset.enabled)} enabled={preset.enabled !== false} slug={preset.slug} />
      <div className="mt-14"><PresetPairs preset={preset} /></div>
      <div className="mt-14"><PresetCollage preset={preset} /></div>
      <div className="mt-16"><PresetDanger slug={preset.slug} name={preset.name} /></div>
    </div>
  );
}
