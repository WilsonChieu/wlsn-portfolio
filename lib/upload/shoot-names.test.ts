import { describe, expect, it } from "vitest";
import { shootNameProblems } from "@/lib/upload/shoot-names";

describe("shootNameProblems", () => {
  it("accepts distinct new names", () => {
    expect(shootNameProblems(["Kelly", "The Gals"], ["wanyi"])).toEqual([null, null]);
  });
  it("flags names without letters or numbers", () => {
    expect(shootNameProblems(["", "!!!"], [])).toEqual([
      "Needs a name with at least one letter or number",
      "Needs a name with at least one letter or number",
    ]);
  });
  it("flags a name that matches an existing shoot in the category", () => {
    expect(shootNameProblems(["Wanyi"], ["wanyi"])[0]).toMatch(/already exists/);
  });
  it("flags two pending shoots that would get the same URL", () => {
    const problems = shootNameProblems(["Export", "export!"], []);
    expect(problems[0]).toBeNull();
    expect(problems[1]).toMatch(/same name as another shoot/i);
  });
});
