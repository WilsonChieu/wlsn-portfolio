import { duitNowUrl } from "@/lib/presets";

export default function BuyLinks({ label, buyUrl, duitNowItem, tone }: { label: string; buyUrl: string | null; duitNowItem: string; tone: "light" | "dark" }) {
  const pill =
    tone === "dark"
      ? "border-bone hover:border-signal hover:bg-signal hover:text-white"
      : "border-char hover:border-signal hover:bg-signal hover:text-white";
  return (
    <div className="flex flex-col gap-3">
      {buyUrl ? (
        <a href={buyUrl} target="_blank" rel="noopener noreferrer" className={`focus-ring flex justify-between rounded-full border px-6 py-4 text-[24px] italic transition-colors md:px-7 md:text-[28px] ${pill}`}>
          {label}<span>→</span>
        </a>
      ) : (
        <span aria-disabled className="flex justify-between rounded-full border border-current px-6 py-4 text-[24px] italic opacity-40 md:px-7 md:text-[28px]">
          Coming soon
        </span>
      )}
      <a href={duitNowUrl(duitNowItem)} target="_blank" rel="noopener noreferrer" className="focus-ring ct-label self-start text-[10px] underline-offset-4 hover:text-signal hover:underline md:text-[11px]">
        Pay by DuitNow? WhatsApp me →
      </a>
    </div>
  );
}
