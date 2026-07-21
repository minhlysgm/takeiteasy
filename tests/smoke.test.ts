import { describe, it, expect } from "vitest";
describe("tokens", () => {
  it("tailwind config exposes role-named colors", async () => {
    const cfg = (await import("../tailwind.config")).default as any;
    expect(cfg.theme.extend.colors.mastered).toBe("#FFD029");
    expect(cfg.theme.extend.colors.en).toBe("#FF7A00");
  });
});
