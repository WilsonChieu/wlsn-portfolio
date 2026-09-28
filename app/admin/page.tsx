import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";
import NewGenreForm from "@/components/admin/NewGenreForm";
import UploadDrop from "@/components/admin/UploadDrop";
import { loadAdminOverview, loadStorageUsage } from "@/lib/admin-data";
import { FREE_STORAGE_BYTES, STORAGE_LIMIT_BYTES, formatGB } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [genres, used] = await Promise.all([loadAdminOverview(), loadStorageUsage()]);
  const nearLimit = used >= STORAGE_LIMIT_BYTES * 0.9;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase">Admin</h1>
        <LogoutButton />
      </div>

      <div className="mt-8 max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Storage: {formatGB(used)} of {formatGB(FREE_STORAGE_BYTES)} free · uploads stop at {formatGB(STORAGE_LIMIT_BYTES)}
        </p>
        <div className="mt-2 h-2 w-full bg-line" aria-hidden>
          <div
            className={`h-full ${nearLimit ? "bg-red-700" : "bg-olive"}`}
            style={{ width: `${Math.min(100, (used / FREE_STORAGE_BYTES) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-10">
        <NewGenreForm />
      </div>

      {genres.map((genre) => (
        <section key={genre.slug} className="mt-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold uppercase">{genre.title}</h2>
            <Link href={`/work/${genre.slug}`} className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              View live →
            </Link>
          </div>
          <UploadDrop genre={genre.slug} existingShoots={genre.shoots.map((s) => s.slug)} />
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {genre.shoots.map((shoot) => (
              <li key={shoot.slug}>
                <Link href={`/admin/${genre.slug}/${shoot.slug}`} className="focus-ring block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-line">
                    {shoot.coverKey && (
                      <Image src={shoot.coverKey} alt={shoot.title} fill sizes="280px" className="object-cover" />
                    )}
                  </div>
                  <p className="mt-2 font-display text-sm font-bold uppercase">{shoot.title}</p>
                  <p className="font-mono text-[10px] text-ink/50">
                    {shoot.photoCount} {shoot.photoCount === 1 ? "photo" : "photos"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
