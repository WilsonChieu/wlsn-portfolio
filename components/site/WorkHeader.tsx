import Link from "next/link";

interface WorkHeaderProps {
  genres: { slug: string; title: string }[];
  current: string;
  back: { href: string; label: string };
}

export default function WorkHeader({ genres, current, back }: WorkHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-char bg-bone">
      <div className="flex items-center justify-between px-5 py-3.5 md:grid md:grid-cols-[1fr_auto_1fr] md:px-12 md:py-6">
        <Link href="/" className="focus-ring text-[22px] tracking-[.04em] hover:text-signal md:text-[28px]">CRISPTAKES</Link>
        <nav className="hidden flex-wrap justify-center gap-x-9 gap-y-1 text-[24px] md:flex">
          {genres.map((g) => (
            <Link key={g.slug} href={`/work/${g.slug}`} aria-current={g.slug === current ? "page" : undefined} className={`focus-ring hover:text-signal ${g.slug === current ? "italic text-signal" : ""}`}>{g.title}</Link>
          ))}
        </nav>
        <Link href={back.href} className="focus-ring ct-label justify-self-end py-3.5 text-[11px] hover:text-signal md:py-0 md:text-[12px]">← {back.label}</Link>
      </div>
    </header>
  );
}
