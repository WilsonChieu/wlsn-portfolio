"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ERROR_TOAST_MS } from "@/components/admin/toasts";

export function useAdminCall() {
  const [busy, setBusy] = useState(false);

  // Resolves to the response (with whether it's already live), or null when it failed (already toasted).
  async function call(method: string, url: string, body: unknown, failure: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        toast.error(failure, { description: String(data.error ?? `Request failed (${res.status})`), duration: ERROR_TOAST_MS });
        return null;
      }
      return { live: data.live === true, data };
    } catch (err) {
      toast.error(failure, { description: err instanceof Error ? err.message : String(err), duration: ERROR_TOAST_MS });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, call };
}
