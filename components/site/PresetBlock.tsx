import BeforeAfter from "@/components/site/BeforeAfter";
import BuyLinks from "@/components/site/BuyLinks";
import ShootGallery from "@/components/site/ShootGallery";
import type { PublicPreset } from "@/lib/presets";

export default function PresetBlock({ preset, flip }: { preset: PublicPreset; flip: boolean }) {
  const photos = preset.collage.map((c) => ({ ...c, alt: `${preset.name} preset — example` }));
  return (
    <section id={preset.slug} className="scroll-mt-24 border-t border-char pt-8 md:grid md:grid-cols-12 md:gap-6 md:pt-12">
      <div className={`flex flex-col gap-4 md:col-span-4 md:row-start-1 ${flip ? "md:col-start-9" : "md:col-start-1"}`}>
        <p className="ct-label text-[11px] tracking-[.16em] text-signal-dark md:text-[12px]">{preset.number} — Preset</p>
        <h2 className="text-[56px] leading-[.9] tracking-[-.03em] md:text-[min(6.4vw,92px)]">{preset.name}</h2>
        {preset.description && <p className="text-[20px] leading-[1.3] [text-wrap:pretty] md:text-[24px]">{preset.description}</p>}
        <p className="text-[30px] italic md:text-[36px]">{preset.price}</p>
        <BuyLinks label={`Buy ${preset.name}`} buyUrl={preset.buyUrl} duitNowItem={`${preset.name} preset`} tone="light" />
      </div>
      <div className={`mt-8 md:col-span-8 md:row-start-1 md:mt-0 ${flip ? "md:col-start-1" : "md:col-start-5"}`}>
        {preset.pairs.length > 0 && <BeforeAfter pairs={preset.pairs} name={preset.name} />}
        {photos.length > 0 && (
          <div className={preset.pairs.length > 0 ? "mt-6" : ""}>
            <ShootGallery title={preset.name} photos={photos} />
          </div>
        )}
      </div>
    </section>
  );
}
