import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CursorTrail from "@/components/site/CursorTrail";
import SiteFooter from "@/components/site/SiteFooter";
import { pad2, plural } from "@/lib/work-nav";
import { getGenre, getGenres } from "@/lib/works";
import photoLoader from "@/lib/image-loader";
import { breadcrumbs, jsonLd, pageMetadata, pageUrl, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getGenres()).map((g) => ({ genre: g.slug }));
}

export async function generateMetadata({ params }: { params: { genre: string } }) {
  const genre = await getGenre(params.genre);
  if (!genre) return {};
  return pageMetadata(`${genre.title} Photographer in Kuala Lumpur & Seremban`, `Book ${genre.title.toLowerCase()} photography in Kuala Lumpur and Seremban with Wilson at CRISPTAKES. Browse past shoots and enquire about your date on WhatsApp.`, pageUrl("work", genre.slug), genre.cover ? photoLoader({ src: genre.cover, width: 1920 }) : undefined);
}

export default async function GenrePage({ params }: { params: { genre: string } }) {
  const [genres, genre] = await Promise.all([getGenres(), getGenre(params.genre)]);
  if (!genre) notFound();

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs([{ name: "Home", url: SITE_URL }, { name: `${genre.title} photography`, url: pageUrl("work", genre.slug) }])) }} />
      <div className="flex flex-col gap-3 px-5 pb-6 pt-10 md:gap-[18px] md:px-12 md:pb-20 md:pt-[110px]">
        <Link href="/#work" className="focus-ring ct-page-back">← All work</Link>
        <p className="ct-label text-[11px] tracking-[.16em] text-signal-dark md:text-[12px]">{genre.meta} · {plural(genre.events.length, "event")}</p>
        <h1 className="text-[96px] leading-[.82] tracking-[-.04em] md:text-[min(19.4vw,280px)] md:leading-[.78] md:tracking-[-.045em]">{genre.title}</h1>
        <p className="mt-4 max-w-xl text-[20px] leading-[1.35] text-mute md:text-[24px]">{genre.title} photography in Kuala Lumpur and Seremban by Wilson at CRISPTAKES. Browse past shoots below, then message me with your date and venue to check availability.</p>
      </div>
      <nav className="flex gap-[22px] overflow-x-auto whitespace-nowrap border-b border-char px-5 pb-5 text-[22px] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
        {genres.map((g) => (
          <Link key={g.slug} href={`/work/${g.slug}`} className={`focus-ring shrink-0 py-2 ${g.slug === genre.slug ? "italic text-signal" : ""}`}>{g.title}</Link>
        ))}
      </nav>

      <main className="flex flex-col gap-12 px-5 pb-16 pt-7 md:gap-[140px] md:px-12 md:pb-[140px] md:pt-10">
        {genre.events.length === 0 && <p className="text-[32px] italic text-mute">No shoots yet.</p>}
        {genre.events.map((ev, i) => {
          const flip = i % 2 === 1;
          return (
            <Link key={ev.slug} href={`/work/${genre.slug}/${ev.slug}`} data-cursor="view" className="focus-ring group flex flex-col gap-3.5 md:grid md:grid-cols-12 md:items-end md:gap-6">
              <div className={`relative aspect-[4/5] overflow-hidden bg-well md:row-start-1 md:aspect-[3/2] ${flip ? "md:col-span-7 md:col-start-6" : "md:col-span-7 md:col-start-1"}`}>
                {ev.cover && <Image src={ev.cover} alt={ev.title} fill sizes="(min-width: 768px) 58vw, 100vw" className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-safe:group-hover:scale-[1.04]" />}
              </div>
              <div className={`flex flex-col gap-3.5 md:row-start-1 md:gap-4 md:pb-1.5 ${flip ? "md:col-span-4 md:col-start-1" : "md:col-span-4 md:col-start-9"}`}>
                <p className="ct-label text-[11px] tracking-[.16em] md:text-[12px]">{pad2(i + 1)} — {plural(ev.images.length, "photo")}</p>
                <div className="flex items-end justify-between gap-4 md:block">
                  <h2 className="text-[40px] leading-[.95] tracking-[-.02em] transition-colors duration-300 [text-wrap:balance] group-hover:italic group-hover:text-signal md:text-[min(5.8vw,84px)] md:leading-[.92] md:tracking-[-.03em]">{ev.title}</h2>
                  <span className="flex-none text-[24px] italic md:hidden">→</span>
                </div>
                <span className="hidden text-[26px] italic md:block">View set →</span>
              </div>
            </Link>
          );
        })}
      </main>
      <SiteFooter />
      <CursorTrail />
    </div>
  );
}
