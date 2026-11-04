import AboutSection from "@/components/site/AboutSection";
import CtaFooter from "@/components/site/CtaFooter";
import CursorTrail from "@/components/site/CursorTrail";
import FaqSection from "@/components/site/FaqSection";
import HomeHero from "@/components/site/HomeHero";
import PresetsSection from "@/components/site/PresetsSection";
import SelectedWork from "@/components/site/SelectedWork";
import SerifMarquee from "@/components/site/SerifMarquee";
import SiteHeader from "@/components/site/SiteHeader";
import { INTRO_SCRIPT } from "@/lib/intro";
import { getPublicPresets } from "@/lib/presets-store";
import { FEATURED_SHOOT, INSTAGRAM, FAQ } from "@/lib/site-content";
import { jsonLd, pageMetadata, SITE_URL, SITE_DESCRIPTION, SITE_NAME, PHOTOGRAPHER_NAME, SERVICE_AREAS } from "@/lib/seo";
import { slideshowFrames, type ShootRef } from "@/lib/work-nav";
import { getGenres } from "@/lib/works";

export const revalidate = 3600;
export const metadata = pageMetadata("Photographer in Kuala Lumpur & Seremban | CRISPTAKES", SITE_DESCRIPTION, SITE_URL);

export default async function Home() {
  const [genres, data] = await Promise.all([getGenres(), getPublicPresets()]);
  const presets = data.presets;
  const presetsEnabled = presets.length > 0;
  const frames = slideshowFrames(genres);
  const featuredEvent = genres.find((g) => g.slug === FEATURED_SHOOT.genre)?.events.find((e) => e.slug === FEATURED_SHOOT.event);
  const featured: ShootRef | null = featuredEvent
    ? { genreSlug: featuredEvent.genreSlug, eventSlug: featuredEvent.slug, title: featuredEvent.title, cover: featuredEvent.cover }
    : frames[0] ?? null;

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": [
        { "@type": "Person", "@id": `${SITE_URL}/#photographer`, name: PHOTOGRAPHER_NAME, alternateName: SITE_NAME, url: SITE_URL, jobTitle: "Event, concert and graduation photographer", sameAs: [INSTAGRAM.url] },
        { "@type": "Organization", "@id": `${SITE_URL}/#business`, name: SITE_NAME, url: SITE_URL, founder: { "@id": `${SITE_URL}/#photographer` }, description: SITE_DESCRIPTION, sameAs: [INSTAGRAM.url], areaServed: SERVICE_AREAS.map((name) => ({ "@type": "City", name })), hasOfferCatalog: { "@type": "OfferCatalog", name: "Photography services", itemListElement: ["Event photography", "Concert photography", "Graduation photography"].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name, provider: { "@id": `${SITE_URL}/#business` }, areaServed: SERVICE_AREAS.map((area) => ({ "@type": "City", name: area })) } })) } },
        { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, alternateName: "Wilson Photography", url: SITE_URL, publisher: { "@id": `${SITE_URL}/#business` } },
        { "@type": "FAQPage", "@id": `${SITE_URL}/#faq`, mainEntity: FAQ.filter((faq) => presetsEnabled || !faq.presetsOnly).map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) },
      ] }) }} />
      {/* Before the header so nothing paints before the intro decides; omitted when there's nothing to reveal. */}
      {frames.length > 0 && <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />}
      <SiteHeader presetsEnabled={presetsEnabled} />
      <main>
        <h1 className="sr-only">CRISPTAKES — Event, concert and graduation photographer in Kuala Lumpur and Seremban</h1>
        <HomeHero frames={frames} featured={featured} />
        <SerifMarquee />
        <SelectedWork genres={genres} />
        <AboutSection />
        {presetsEnabled && <PresetsSection presets={presets} />}
        <FaqSection presetsEnabled={presetsEnabled} />
      </main>
      <CtaFooter />
      <CursorTrail />
    </div>
  );
}
