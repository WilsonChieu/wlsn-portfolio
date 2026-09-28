"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

// Matches Sonner's own mobile breakpoint; on phones the top keeps toasts clear of the thumb and the OS home bar.
const MOBILE_QUERY = "(max-width: 599px)";

export default function AdminToaster() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      position={mobile ? "top-center" : "bottom-right"}
      toastOptions={{
        style: {
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: 0,
          fontFamily: "var(--font-manrope), sans-serif",
        },
        classNames: { description: "!text-ink/60" },
      }}
    />
  );
}
