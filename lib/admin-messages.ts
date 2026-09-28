export interface ToastMessage {
  type: "success" | "warning" | "error";
  title: string;
  description: string;
}

const photos = (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`;

export function liveNote(live: boolean): string {
  return live ? "Live on the portfolio" : "Saved · the portfolio updates within an hour";
}

export function uploadSummary({
  added,
  failed,
  shootTitle,
  live,
}: {
  added: number;
  failed: number;
  shootTitle: string;
  live: boolean;
}): ToastMessage {
  if (failed === 0) return { type: "success", title: `${photos(added)} added to ${shootTitle}`, description: liveNote(live) };
  if (added > 0) {
    return { type: "warning", title: `${added} added to ${shootTitle}, ${failed} failed`, description: "Use Retry for the failed photos" };
  }
  return {
    type: "error",
    title: `Upload to ${shootTitle} failed for ${photos(failed)}`,
    description: "Use Retry, or check the reason next to each photo",
  };
}
