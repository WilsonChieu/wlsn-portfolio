"use client";

import { usePathname } from "next/navigation";
import WorkHeader from "@/components/site/WorkHeader";

export default function WorkShell({ genres, children }: {
  genres: { slug: string; title: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <WorkHeader genres={genres} current={pathname.split("/")[2]} />
      <div key={pathname} className="ct-work-page">{children}</div>
    </div>
  );
}
