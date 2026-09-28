"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { filesFromDataTransfer, filesFromInput, groupFiles, type PathedFile } from "@/lib/upload/collect-files";
import { uploadShoot, type FileStatus } from "@/lib/upload/upload-shoot";

interface UploadDropProps {
  genre: string;
  target?: { event: string; title: string };
}

interface PendingShoot {
  title: string;
  files: File[];
}

type Phase = "idle" | "review" | "uploading" | "finished";

const button = "focus-ring border border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em]";

export default function UploadDrop({ genre, target }: UploadDropProps) {
  const router = useRouter();
  const folderInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [shoots, setShoots] = useState<PendingShoot[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Map<File, FileStatus>>(new Map());
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, []);

  function accept(items: PathedFile<File>[]) {
    const result = groupFiles(items, target ? "single" : "by-folder");
    setShoots(result.groups.map((g) => ({ title: target?.title ?? g.name, files: g.files })));
    setSkipped(result.skipped);
    setStatuses(new Map());
    setError(result.groups.length ? null : "No photos found in what you dropped.");
    setPhase(result.groups.length ? "review" : "idle");
  }

  function setStatus(file: File, status: FileStatus) {
    setStatuses((prev) => new Map(prev).set(file, status));
  }

  async function run(list: PendingShoot[]) {
    if (list.some((s) => !slugify(s.title))) {
      setError("Every shoot needs a name with at least one letter or number.");
      return;
    }
    setPhase("uploading");
    setError(null);
    for (const shoot of list) {
      try {
        await uploadShoot(
          { genre, event: target?.event ?? slugify(shoot.title), title: shoot.title.trim(), files: shoot.files },
          setStatus
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        for (const file of shoot.files) setStatus(file, { state: "failed", error: message });
      }
    }
    setPhase("finished");
    router.refresh();
  }

  function retryFailed() {
    const failed = shoots
      .map((s) => ({ ...s, files: s.files.filter((f) => statuses.get(f)?.state === "failed") }))
      .filter((s) => s.files.length > 0);
    run(failed);
  }

  function reset() {
    setShoots([]);
    setSkipped([]);
    setStatuses(new Map());
    setError(null);
    setPhase("idle");
  }

  const failedCount = [...statuses.values()].filter((s) => s.state === "failed").length;
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) accept(filesFromInput(e.target.files));
    e.target.value = "";
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (phase === "uploading") return;
          filesFromDataTransfer(e.dataTransfer).then(accept, (err) => setError(String(err)));
        }}
        className={`border border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-olive bg-olive/10" : "border-line"
        }`}
      >
        <p className="font-body text-sm text-ink/70">
          {target
            ? "Drop photos or a folder here to add them to this shoot"
            : "Drop shoot folders here — each folder becomes a shoot"}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <label className={`${button} cursor-pointer`}>
            Choose folder
            <input ref={folderInput} type="file" multiple className="sr-only" onChange={onPick} />
          </label>
          <label className={`${button} cursor-pointer`}>
            Choose photos
            <input type="file" multiple accept="image/*,.heic,.heif" className="sr-only" onChange={onPick} />
          </label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {skipped.length > 0 && (
        <details className="mt-3 text-sm text-ink/60">
          <summary className="cursor-pointer">{skipped.length} files skipped (not photos)</summary>
          <ul className="mt-2 font-mono text-[11px]">
            {skipped.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      )}

      {phase !== "idle" && (
        <div className="mt-6 space-y-6">
          {shoots.map((shoot, i) => (
            <div key={i} className="border border-line p-4">
              {target ? (
                <p className="font-display font-bold uppercase">{shoot.title}</p>
              ) : (
                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">Shoot name</span>
                  <input
                    value={shoot.title}
                    disabled={phase !== "review"}
                    onChange={(e) =>
                      setShoots((prev) => prev.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))
                    }
                    className="focus-ring mt-1 w-full border border-line bg-paper px-3 py-2"
                  />
                  <span className="mt-1 block font-mono text-[11px] text-ink/40">
                    /work/{genre}/{slugify(shoot.title) || "…"}
                  </span>
                </label>
              )}
              <ul className="mt-3 grid gap-1 font-mono text-[11px]">
                {shoot.files.map((file, j) => {
                  const s = statuses.get(file);
                  const tone = s?.state === "failed" ? "text-red-700" : s?.state === "done" ? "text-olive" : "text-ink/60";
                  return (
                    <li key={j} className={tone}>
                      {file.name} — {s?.state ?? "ready"}
                      {s?.error ? `: ${s.error}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            {phase === "review" && (
              <button type="button" onClick={() => run(shoots)} className={`${button} bg-ink text-paper`}>
                Upload
              </button>
            )}
            {phase === "uploading" && <p className="font-mono text-[11px] uppercase tracking-[0.16em]">Uploading…</p>}
            {phase === "finished" && failedCount > 0 && (
              <button type="button" onClick={retryFailed} className={`${button} bg-ink text-paper`}>
                Retry {failedCount} failed
              </button>
            )}
            {phase !== "uploading" && (
              <button type="button" onClick={reset} className={button}>
                {phase === "finished" ? "Done" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
