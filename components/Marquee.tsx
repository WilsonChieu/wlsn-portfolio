"use client";

const ITEMS = ["EVENTS", "GRADUATIONS", "CONCERTS"];

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-olive md:h-7 md:w-7"
      aria-hidden
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-8 font-display text-3xl font-bold uppercase md:text-5xl">
          {item}
          <SparkleIcon />
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
