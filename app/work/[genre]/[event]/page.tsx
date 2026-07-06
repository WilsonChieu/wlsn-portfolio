import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, getGenres } from "@/lib/works";

export function generateStaticParams() {
  return getGenres().flatMap((g) =>
    g.events.map((e) => ({ genre: g.slug, event: e.slug }))
  );
}

export function generateMetadata({ params }: { params: { genre: string; event: string } }) {
  const event = getEvent(params.genre, params.event);
  if (!event) return {};
  return { title: `${event.title} — WLSN` };
}

export default function EventPage({ params }: { params: { genre: string; event: string } }) {
  const event = getEvent(params.genre, params.event);
  if (!event) notFound();

  const genreLabel = event.genreSlug.charAt(0).toUpperCase() + event.genreSlug.slice(1);

  return (
    <div className="min-h-screen bg-paper">
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <Link href="/" className="font-display text-lg font-bold uppercase tracking-tight focus-ring">
          CRISP<span className="text-olive">TAKES</span>
        </Link>
        <Link
          href={`/work/${params.genre}`}
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-olive focus-ring"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {genreLabel}
        </Link>
      </header>

      {/* Hero */}
      <div className="relative h-[60vh] w-full overflow-hidden md:h-[75vh]">
        <Image
          src={event.cover}
          alt={event.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-ink/35" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-12">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
            {genreLabel} · {event.images.length} {event.images.length === 1 ? "photo" : "photos"}
          </p>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] text-paper md:text-8xl">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Gallery */}
      <main className="px-6 py-16 md:px-12 md:py-24">
        <div className="columns-1 gap-4 sm:columns-2 md:gap-6 lg:columns-3">
          {event.images.map((img, i) => (
            <div key={i} className="mb-4 break-inside-avoid overflow-hidden md:mb-6">
              <Image
                src={img.src}
                alt={img.alt}
                width={1200}
                height={800}
                className="w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:scale-[1.02]"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-line px-6 py-8 md:px-12">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/40">
            CRISPTAKES
          </span>
          <Link
            href={`/work/${params.genre}`}
            className="font-mono text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-olive focus-ring"
          >
            ← Back to {genreLabel}
          </Link>
        </div>
      </footer>
    </div>
  );
}
