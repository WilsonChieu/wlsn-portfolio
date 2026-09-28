"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
      className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60 hover:text-ink"
    >
      Log out
    </button>
  );
}
