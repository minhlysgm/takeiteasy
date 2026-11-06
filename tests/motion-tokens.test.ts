import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import config from "@/tailwind.config";

// Chuyển động theo checklist: hiện dần dùng chung một keyframe, ease-out, 200–400ms.
const css = readFileSync("app/globals.css", "utf8");
const theme = config.theme!.extend as { keyframes: Record<string, unknown>; animation: Record<string, string> };

describe("chuyển động", () => {
  it("mô tả hiện dần dùng chung keyframe fade-in, 300ms ease-out", () => {
    expect(theme.keyframes["caption-in"]).toBeUndefined();
    expect(theme.animation["caption-in"]).toBe("fade-in 300ms ease-out");
  });

  it("mũi tên ghi chú vẽ ~400ms ease-out; thẻ mới trượt vào 300ms", () => {
    expect(css).toMatch(/\.arrow-draw \{[^}]*animation: draw 0\.4s ease-out forwards;/);
    expect(css).toMatch(/\.animate-passage-in \{ animation: passage-in 0\.3s ease-out; \}/);
  });

  it("vẫn tắt khi giảm chuyển động", () => {
    const reduce = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduce).toContain(".arrow-draw { animation: none;");
    expect(reduce).toContain(".animate-passage-in { animation: none; }");
  });
});
