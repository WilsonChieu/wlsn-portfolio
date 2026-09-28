import { describe, expect, it } from "vitest";
import { liveNote, uploadSummary } from "@/lib/admin-messages";

describe("liveNote", () => {
  it("says the change is live when the portfolio refreshed", () => {
    expect(liveNote(true)).toBe("Live on the portfolio");
  });
  it("says when the portfolio will catch up when the refresh failed", () => {
    expect(liveNote(false)).toBe("Saved · the portfolio updates within an hour");
  });
});

describe("uploadSummary", () => {
  it("reports a fully successful upload with a pluralised count", () => {
    expect(uploadSummary({ added: 12, failed: 0, shootTitle: "Kelly", live: true })).toEqual({
      type: "success",
      title: "12 photos added to Kelly",
      description: "Live on the portfolio",
    });
    expect(uploadSummary({ added: 1, failed: 0, shootTitle: "Kelly", live: false }).title).toBe("1 photo added to Kelly");
  });

  it("warns about a partial upload and points to Retry", () => {
    expect(uploadSummary({ added: 10, failed: 2, shootTitle: "Kelly", live: true })).toEqual({
      type: "warning",
      title: "10 added to Kelly, 2 failed",
      description: "Use Retry for the failed photos",
    });
  });

  it("reports an upload where nothing was added as an error", () => {
    expect(uploadSummary({ added: 0, failed: 3, shootTitle: "Kelly", live: false })).toEqual({
      type: "error",
      title: "Upload to Kelly failed for 3 photos",
      description: "Use Retry, or check the reason next to each photo",
    });
  });
});
