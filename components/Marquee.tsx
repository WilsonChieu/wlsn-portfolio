"use client";

const ITEMS = ["TALKS", "WORKSHOPS", "GRADUATIONS", "CONCERTS"];

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-8 font-display text-3xl font-bold uppercase md:text-5xl">
          {item}
          <span className="text-olive">✳</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="overflow-hidden border-y border-line py-6">
      <div className="marquee-track flex w-max">
        <Track />
        <Track />
      </div>
    </div>
  );
}
