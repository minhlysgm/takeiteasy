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
      }
    }
  }
});
