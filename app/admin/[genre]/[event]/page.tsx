import Link from "next/link";
import { notFound } from "next/navigation";
import ShootEditor from "@/components/admin/ShootEditor";
import UploadDrop from "@/components/admin/UploadDrop";
import { loadShoot } from "@/lib/admin-data";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function AdminShootPage({ params }: { params: { genre: string; event: string } }) {
  if (!isSlug(params.genre) || !isSlug(params.event)) notFound();
  const manifest = await loadShoot(params.genre, params.event);
  if (!manifest) notFound();

  const visible = manifest.photos.filter((p) => !p.hidden).length;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
        ← All shoots
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold uppercase">{manifest.title}</h1>
      <p className="mt-2 font-mono text-[11px] text-ink/50">
        {visible} {visible === 1 ? "photo" : "photos"} ·{" "}
        <Link href={`/work/${params.genre}/${params.event}`} className="focus-ring underline">
          /work/{params.genre}/{params.event}
        </Link>
      </p>
      <div className="mt-8">
        <UploadDrop genre={params.genre} target={{ event: params.event, title: manifest.title }} />
      </div>
      <ShootEditor genre={params.genre} event={params.event} manifest={manifest} />
    </div>
  );
}
