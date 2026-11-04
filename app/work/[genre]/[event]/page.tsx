import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CursorTrail from "@/components/site/CursorTrail";
import ShootGallery from "@/components/site/ShootGallery";
import SiteFooter from "@/components/site/SiteFooter";
import { nextShoot, plural } from "@/lib/work-nav";
import { getEvent, getGenres } from "@/lib/works";
import photoLoader from "@/lib/image-loader";
import { breadcrumbs, jsonLd, pageMetadata, pageUrl, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getGenres()).flatMap((g) => g.events.map((e) => ({ genre: g.slug, event: e.slug })));
}

export async function generateMetadata({ params }: { params: { genre: string; event: string } }) {
  const event = await getEvent(params.genre, params.event);
  if (!event) return {};
  return pageMetadata(`${event.title} — ${event.genreTitle} Photography`, `${event.title}, photographed by Wilson at CRISPTAKES. View ${event.images.length} photos from this ${event.genreTitle.toLowerCase()} shoot and enquire about photography bookings.`, pageUrl("work", event.genreSlug, event.slug), event.cover ? photoLoader({ src: event.cover, width: 1920 }) : undefined);
}

export default async function EventPage({ params }: { params: { genre: string; event: string } }) {
  const [genres, event] = await Promise.all([getGenres(), getEvent(params.genre, params.event)]);
  if (!event) notFound();
  const next = nextShoot(genres, event.genreSlug, event.slug);
  const photos = event.images.map((img) => ({ id: img.id, src: img.src, width: img.width, height: img.height, alt: img.alt }));

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs([{ name: "Home", url: SITE_URL }, { name: `${event.genreTitle} photography`, url: pageUrl("work", event.genreSlug) }, { name: event.title, url: pageUrl("work", event.genreSlug, event.slug) }])) }} />
      <main className="flex flex-col gap-3.5 px-5 pt-9 md:grid md:grid-cols-12 md:items-end md:gap-6 md:px-12 md:pt-[100px]">
        <Link href={`/work/${event.genreSlug}`} className="focus-ring ct-page-back col-span-12">← {event.genreTitle}</Link>
        <p className="ct-label col-span-12 text-[11px] tracking-[.16em] text-signal-dark md:text-[12px]">{event.genreTitle} · {plural(photos.length, "photo")}</p>
        <h1 className="col-span-9 text-[68px] leading-[.86] tracking-[-.035em] [text-wrap:balance] md:mb-14 md:text-[min(12.8vw,184px)] md:leading-[.84] md:tracking-[-.04em]">{event.title}</h1>
        <ShootGallery title={event.title} photos={photos} />
      </main>

      {next && (
        <Link href={`/work/${next.genreSlug}/${next.eventSlug}`} data-cursor="view" className="focus-ring group mx-5 mt-[72px] flex flex-col gap-3.5 border-t border-char pb-10 pt-7 md:mx-12 md:mt-40 md:grid md:grid-cols-12 md:items-end md:gap-6 md:pb-[72px] md:pt-12">
          <div className="flex flex-col gap-3.5 md:col-span-8 md:gap-[18px]">
            <span className="ct-label text-[11px] tracking-[.16em] md:text-[12px]">Next set →</span>
            <span className="order-last text-[48px] leading-[.9] tracking-[-.03em] transition-colors duration-300 [text-wrap:balance] group-hover:italic group-hover:text-signal md:order-none md:text-[min(8.9vw,128px)] md:leading-[.86] md:tracking-[-.035em]">{next.title}</span>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden bg-well md:col-span-4">
            {next.cover && <Image src={next.cover} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />}
          </div>
        </Link>
      )}
      <SiteFooter />
      <CursorTrail />
    </div>
  );
}
