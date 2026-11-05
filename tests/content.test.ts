import { describe, expect, it } from "vitest";
import { books, findChunkRange, getPassages } from "@/lib/content";

describe("content validation", () => {
  it("có ít nhất 1 sách", () => {
    expect(books.length).toBeGreaterThan(0);
  });
  for (const book of books) {
    for (const chapter of book.chapters) {
      const passages = getPassages(book.id, chapter.id) ?? [];
      it(`${book.id}/${chapter.id}: passageCount khớp số đoạn thật`, () => {
        expect(passages.length).toBe(chapter.passageCount);
      });
      it(`${book.id}/${chapter.id}: id đoạn không trùng`, () => {
        const ids = passages.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
      for (const p of passages) {
        it(`${p.id}: chunks hợp lệ`, () => {
          const ids = p.chunks.map((c) => c.id);
          expect(new Set(ids).size, "id chunk trùng").toBe(ids.length);
          for (const c of p.chunks) {
            expect(findChunkRange(p.original, c), `chunk "${c.id}" — match "${c.match}" không có trong original`).not.toBeNull();
            expect(c.examples.length, `chunk "${c.id}" thiếu examples`).toBeGreaterThan(0);
          }
        });
        it(`${p.id}: có sketch hợp lệ`, () => {
          expect(p.sketch, "thiếu sketch").toBeDefined();
          const { alt, viewBox, steps } = p.sketch!;
          expect(alt.length, "alt quá ngắn").toBeGreaterThan(10);
          expect(viewBox).toMatch(/^0 0 \d+ \d+$/);
          expect(steps.some((s) => s.kind === "text"), "thiếu bước text").toBe(true);
          expect(steps.some((s) => s.kind === "path" || s.kind === "ellipse" || s.kind === "arrow"), "thiếu nét vẽ").toBe(true);
          for (const s of steps) {
            if ("seed" in s && s.seed !== undefined) expect(Number.isInteger(s.seed), `seed ${s.seed} không nguyên`).toBe(true);
          }
        });
      }
    }
  }
});

describe("passageIndexOf", () => {
  it("số đoạn hợp lệ giữ nguyên; sai thì kẹp về 1 hoặc đoạn cuối", async () => {
    const { passageIndexOf } = await import("@/lib/passageIndex");
    expect(passageIndexOf("2", 3)).toBe(2);
    expect(passageIndexOf("3", 3)).toBe(3);
    expect(passageIndexOf("99", 3)).toBe(3);
    expect(passageIndexOf("0", 3)).toBe(1);
    expect(passageIndexOf("-4", 3)).toBe(1);
    expect(passageIndexOf("abc", 3)).toBe(1);
    expect(passageIndexOf("1.5", 3)).toBe(1);
    expect(passageIndexOf("", 3)).toBe(1);
  });
});
