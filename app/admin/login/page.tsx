"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Login failed");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-sm flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase">Admin</h1>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring border border-line bg-paper px-3 py-2"
          required
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="focus-ring bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50"
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
