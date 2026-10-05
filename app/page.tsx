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
import { FEATURED_SHOOT, PRESETS_ENABLED } from "@/lib/site-content";
import { slideshowFrames, type ShootRef } from "@/lib/work-nav";
import { getGenres } from "@/lib/works";

export const revalidate = 3600;

export default async function Home() {
  const genres = await getGenres();
  const frames = slideshowFrames(genres);
  const featuredEvent = genres.find((g) => g.slug === FEATURED_SHOOT.genre)?.events.find((e) => e.slug === FEATURED_SHOOT.event);
  const featured: ShootRef | null = featuredEvent
    ? { genreSlug: featuredEvent.genreSlug, eventSlug: featuredEvent.slug, title: featuredEvent.title, cover: featuredEvent.cover }
    : frames[0] ?? null;

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      {/* Before the header so nothing paints before the intro decides; omitted when there's nothing to reveal. */}
      {frames.length > 0 && <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />}
      <SiteHeader />
      <main>
        <HomeHero frames={frames} featured={featured} />
        <SerifMarquee />
        <SelectedWork genres={genres} />
        <AboutSection />
        {PRESETS_ENABLED && <PresetsSection />}
        <FaqSection />
      </main>
      <CtaFooter />
      <CursorTrail />
    </div>
  );
}
