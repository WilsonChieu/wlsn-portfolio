import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { PATCH } from "@/app/api/admin/presets/route";
import { PATCH as updatePreset } from "@/app/api/admin/presets/[preset]/route";
import { requireAdmin, revalidateSite } from "@/lib/admin-api";
import { loadPresets, savePresets } from "@/lib/presets-store";
import { createPreset, emptyPresets } from "@/lib/presets";

vi.mock("@/lib/admin-api", () => ({ requireAdmin: vi.fn(), revalidateSite: vi.fn(async () => true), readBody: async (req: Request) => req.json().catch(() => null), jsonError: (error: string, status = 400) => Response.json({ error }, { status }) }));
vi.mock("@/lib/presets-store", () => ({ loadPresets: vi.fn(), savePresets: vi.fn() }));
vi.mock("@/lib/r2", () => ({ deletePrefix: vi.fn(), publicBucket: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(requireAdmin).mockResolvedValue(null); vi.mocked(loadPresets).mockResolvedValue(createPreset(emptyPresets(), "City Warm").manifest); });
const request = (body: unknown) => new Request("http://localhost/api/admin/presets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("preset admin mutations", () => {
  it("does not read or save presets without authentication", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
    expect((await PATCH(request({ enabled: false }))).status).toBe(401);
    expect(loadPresets).not.toHaveBeenCalled();
    expect(savePresets).not.toHaveBeenCalled();
  });
  it("changes section visibility while preserving the existing bundle and photos", async () => {
    const existing = await loadPresets();
    const response = await PATCH(request({ enabled: false }));
    expect(await response.json()).toEqual({ live: true });
    expect(savePresets).toHaveBeenCalledWith({ ...existing, enabled: false });
    expect(revalidateSite).toHaveBeenCalledOnce();
  });
  it("can hide one preset without deleting it", async () => {
    await updatePreset(request({ enabled: false }), { params: { preset: "city-warm" } });
    expect(savePresets).toHaveBeenCalledWith(expect.objectContaining({ presets: [expect.objectContaining({ slug: "city-warm", enabled: false })] }));
  });
  it("rejects unknown presets without writing", async () => {
    expect((await updatePreset(request({ enabled: true }), { params: { preset: "missing" } })).status).toBe(404);
    expect(savePresets).not.toHaveBeenCalled();
  });
  it("rejects unsafe purchase links without writing", async () => {
    expect((await updatePreset(request({ name: "City Warm", description: "Test", price: "RM 29", buyUrl: "javascript:alert(1)" }), { params: { preset: "city-warm" } })).status).toBe(400);
    expect(savePresets).not.toHaveBeenCalled();
  });
});
