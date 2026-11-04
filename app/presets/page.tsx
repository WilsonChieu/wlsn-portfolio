import { notFound } from "next/navigation";
import BuyLinks from "@/components/site/BuyLinks";
import CtaFooter from "@/components/site/CtaFooter";
import CursorTrail from "@/components/site/CursorTrail";
import PresetBlock from "@/components/site/PresetBlock";
import SiteHeader from "@/components/site/SiteHeader";
import { getPublicPresets } from "@/lib/presets-store";
import { pageMetadata, pageUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata("Lightroom Presets by Wilson", "Explore CRISPTAKES Lightroom presets with real before and after photo comparisons, prices and purchase options.", pageUrl("presets"));

export default async function PresetsPage() {
  const data = await getPublicPresets();
  if (data.presets.length === 0) notFound();

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <SiteHeader current="presets" presetsEnabled />
      <div className="px-5 pb-10 pt-10 md:grid md:grid-cols-12 md:gap-6 md:px-12 md:pb-20 md:pt-[110px]">
        <div className="md:col-span-7">
          <p className="ct-label text-[11px] tracking-[.16em] text-signal-dark md:text-[12px]">Lightroom presets · {data.presets.length} {data.presets.length === 1 ? "preset" : "presets"}</p>
          <h1 className="mt-3 text-[84px] leading-[.84] tracking-[-.04em] md:text-[min(13vw,190px)]">Presets <i className="text-signal">for sale</i></h1>
          <p className="mt-6 max-w-[34ch] text-[22px] leading-[1.25] md:text-[28px]">The looks I use on my own concert, event and graduation sets — one click in Lightroom.</p>
          <ul className="mt-6 flex flex-col gap-2">
            {data.includes.map((line) => (
              <li key={line} className="ct-label text-[10px] md:text-[12px]">— {line}</li>
            ))}
          </ul>
        </div>
        {data.bundle && (
          <div className="mt-10 bg-char p-6 text-bone md:col-span-5 md:mt-0 md:self-end md:p-8">
            <p className="ct-label text-[10px] md:text-[11px]">The bundle</p>
            <p className="mt-2 text-[40px] leading-[.95] md:text-[52px]">All {data.presets.length} presets</p>
            <p className="mt-2 text-[30px] italic">{data.bundle.price}{data.bundle.saving && <span className="text-signal"> · save {data.bundle.saving}</span>}</p>
            <div className="mt-6"><BuyLinks label="Buy the bundle" buyUrl={data.bundle.buyUrl} duitNowItem="full preset bundle" tone="dark" /></div>
          </div>
        )}
      </div>

      <main className="flex flex-col gap-20 px-5 pb-16 md:gap-[140px] md:px-12 md:pb-[140px]">
        {data.presets.map((p, i) => (
          <PresetBlock key={p.slug} preset={p} flip={i % 2 === 1} />
        ))}
        <p className="ct-label max-w-[60ch] text-[10px] leading-[1.7] md:text-[11px]">
          Purchase through the linked shop, or contact me on WhatsApp to arrange a manual purchase.
        </p>
      </main>
      <CtaFooter />
      <CursorTrail />
    </div>
  );
}
