import { describe, expect, it, vi } from "vitest";
import type { Chunk } from "@/content/types";
import { findChunkRange, findChunkRanges } from "@/lib/content";

const chunk = (over: Partial<Chunk>): Chunk => ({
  id: "c", match: "x", label: "", headword: "", meaning: "", examples: [{ en: "e", vi: "v" }],
  ...over,
});

describe("findChunkRange", () => {
  it("tìm thấy lần xuất hiện đầu tiên", () => {
    expect(findChunkRange("a cat sat", chunk({ match: "cat" }))).toEqual({
      chunk: expect.objectContaining({ match: "cat" }), start: 2, end: 5,
    });
  });
  it("occurrence chọn lần xuất hiện thứ n", () => {
    const r = findChunkRange("the cat and the cat", chunk({ match: "cat", occurrence: 2 }));
    expect(r?.start).toBe(16);
  });
  it("trả null khi không khớp", () => {
    expect(findChunkRange("a cat", chunk({ match: "dog" }))).toBeNull();
  });
});

describe("findChunkRanges", () => {
  it("sort theo vị trí và bỏ qua chunk không khớp (kèm warn)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = findChunkRanges("the cat sat on the mat", [
      chunk({ id: "mat", match: "mat" }),
      chunk({ id: "dog", match: "dog" }),
      chunk({ id: "cat", match: "cat" }),
    ]);
    expect(out.map((r) => r.chunk.id)).toEqual(["cat", "mat"]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
