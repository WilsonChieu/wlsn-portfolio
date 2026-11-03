import WorkShell from "@/components/site/WorkShell";
import { getGenres } from "@/lib/works";

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  const genres = await getGenres();
  return <WorkShell genres={genres.map(({ slug, title }) => ({ slug, title }))}>{children}</WorkShell>;
}
