"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { easeStandard } from "@/lib/motion";

const REFERRAL_OPTIONS = ["Instagram", "Xiaohongshu", "Word of mouth", "Google", "Other"];
const PURPOSE_OPTIONS = ["Concert / Live Set", "Talk / Speaker Event", "Workshop", "Graduation", "Other"];

type Status = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full border-b border-line bg-transparent py-2 font-body text-base text-ink outline-none transition-colors focus:border-olive";
const labelClass = "font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50";

export default function BookingModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState(REFERRAL_OPTIONS[0]);
  const [referralOther, setReferralOther] = useState("");
  const [purpose, setPurpose] = useState(PURPOSE_OPTIONS[0]);
  const [purposeOther, setPurposeOther] = useState("");
  const [hasDate, setHasDate] = useState<"yes" | "no">("no");
  const [date, setDate] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function reset() {
    setStatus("idle");
    setName("");
    setEmail("");
    setPhone("");
    setReferral(REFERRAL_OPTIONS[0]);
    setReferralOther("");
    setPurpose(PURPOSE_OPTIONS[0]);
    setPurposeOther("");
    setHasDate("no");
    setDate("");
    setDetails("");
  }

  function close() {
    setOpen(false);
    window.setTimeout(reset, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          referral: referral === "Other" ? referralOther || "Other" : referral,
          purpose: purpose === "Other" ? purposeOther || "Other" : purpose,
          date: hasDate === "yes" ? date : "",
          details,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring mt-10 rounded-full bg-olive px-8 py-4 font-mono text-[12px] uppercase tracking-[0.16em] text-ink transition-transform hover:scale-105"
      >
        Book a Shoot →
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easeStandard }}
          >
            <div
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
              onClick={close}
              aria-hidden
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-modal-title"
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto border border-line bg-paper p-8 md:p-10"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: easeStandard }}
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="focus-ring absolute right-6 top-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50 transition-colors hover:text-olive"
              >
                Close
              </button>

              {status === "success" ? (
                <div className="flex flex-col gap-3 py-8">
                  <h2 className="font-display text-2xl font-bold uppercase leading-[0.95]">
                    Got it.
                  </h2>
                  <p className="font-body text-ink/70">
                    Your inquiry is in and pending review — check your email for a confirmation,
                    I&apos;ll follow up within 48 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <h2
                    id="booking-modal-title"
                    className="font-display text-2xl font-bold uppercase leading-[0.95] md:text-3xl"
                  >
                    Book a Shoot
                  </h2>

                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>Name</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>Email</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>Phone Number</span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>How did you hear about me?</span>
                    <select
                      value={referral}
                      onChange={(e) => setReferral(e.target.value)}
                      className={inputClass}
                    >
                      {REFERRAL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {referral === "Other" && (
                      <input
                        type="text"
                        required
                        placeholder="Tell me where"
                        value={referralOther}
                        onChange={(e) => setReferralOther(e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>Purpose of Inquiry</span>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className={inputClass}
                    >
                      {PURPOSE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {purpose === "Other" && (
                      <input
                        type="text"
                        required
                        placeholder="Tell me what you need"
                        value={purposeOther}
                        onChange={(e) => setPurposeOther(e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </label>

                  <div className="flex flex-col gap-2">
                    <span className={labelClass}>Do you have a specific date?</span>
                    <div className="relative inline-flex w-fit rounded-full border border-olive p-1">
                      <motion.div
                        className="absolute inset-y-1 left-1 w-16 rounded-full bg-olive"
                        animate={{ x: hasDate === "yes" ? 0 : "4rem" }}
                        transition={{ type: "spring", stiffness: 500, damping: 26, mass: 0.7 }}
                      />
                      {(["yes", "no"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setHasDate(opt)}
                          className={`focus-ring relative z-10 w-16 rounded-full py-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                            hasDate === opt ? "text-ink" : "text-ink/50 hover:text-olive"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence initial={false}>
                      {hasDate === "yes" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: easeStandard }}
                          className="overflow-hidden"
                        >
                          <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={`${inputClass} mt-2`}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className={labelClass}>Anything else? (optional)</span>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </label>

                  {status === "error" && (
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">
                      Something went wrong — try again, or email crisptakes@gmail.com directly.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="focus-ring mt-2 rounded-full bg-olive px-8 py-4 font-mono text-[12px] uppercase tracking-[0.16em] text-ink transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {status === "submitting" ? "Sending…" : "Send Inquiry"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
