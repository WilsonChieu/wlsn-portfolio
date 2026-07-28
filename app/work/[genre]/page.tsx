import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGenre, getGenres } from "@/lib/works";
import ScrollHeader from "@/components/ScrollHeader";

export function generateStaticParams() {
  return getGenres().map((g) => ({ genre: g.slug }));
}

export function generateMetadata({ params }: { params: { genre: string } }) {
  const genre = getGenre(params.genre);
  if (!genre) return {};
  return { title: `${genre.title} — WLSN` };
}

export default function GenrePage({ params }: { params: { genre: string } }) {
  const genre = getGenre(params.genre);
  if (!genre) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <ScrollHeader overDark={false}>
        <Link href="/" className="font-display text-lg font-bold uppercase tracking-tight focus-ring">
          CRISP<span className="text-olive">TAKES</span>
        </Link>
        <Link
          href="/#work"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-olive focus-ring"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All Work
        </Link>
      </ScrollHeader>

      <div className="px-6 pb-16 pt-40 md:px-12 md:pt-48">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          {genre.meta}
        </p>
        <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] md:text-8xl">
          {genre.title}
        </h1>
      </div>

      <main className="px-6 pb-24 md:px-12 md:pb-32">
        {genre.events.length === 0 ? (
          <p className="font-body text-ink/40">No events yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {genre.events.map((event) => (
              <Link
                key={event.slug}
                href={`/work/${genre.slug}/${event.slug}`}
                className="group relative block aspect-[4/3] overflow-hidden focus-ring"
              >
                {event.cover ? (
                  <Image
                    src={event.cover}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                ) : (
                  <div className="h-full w-full bg-line" />
                )}
                <div
                  className="absolute inset-0 bg-ink/20 transition-opacity duration-500 group-hover:bg-ink/50"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
                    {event.images.length} {event.images.length === 1 ? "photo" : "photos"}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold uppercase leading-tight text-paper md:text-2xl">
                    {event.title}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
