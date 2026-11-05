import { describe, expect, it } from "vitest";
import { books, findChunkRange, firstSentence, getPassages } from "@/lib/content";

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

describe("firstSentence", () => {
  it("firstSentence: cắt tới dấu chấm đầu tiên", () => {
    expect(firstSentence("Bukowski wanted to be a writer. But for decades…")).toBe("Bukowski wanted to be a writer.");
    expect(firstSentence("See, despite the fame, he was a loser. He knew it.")).toBe("See, despite the fame, he was a loser.");
  });
  it("firstSentence: chỉ xét dòng đầu; không có dấu chấm thì lấy cả dòng", () => {
    expect(firstSentence("Which is why\n\nhe's the perfect place")).toBe("Which is why");
    expect(firstSentence("  no punctuation here  ")).toBe("no punctuation here");
  });
  it("firstSentence: giữ dấu hỏi/chấm than và ngoặc kép đóng", () => {
    expect(firstSentence('He said "Don\'t try." Then left.')).toBe('He said "Don\'t try."');
    expect(firstSentence("Why? Because.")).toBe("Why?");
  });
  it("firstSentence: dấu chấm giữa số không phải hết câu", () => {
    expect(firstSentence("It cost 3.5 dollars. Cheap.")).toBe("It cost 3.5 dollars.");
  });
  it("firstSentence của 3 đoạn ch01 khớp mockup", () => {
    const ps = getPassages("the-subtle-art", "ch01")!;
    expect(firstSentence(ps[1].original)).toBe("Bukowski wanted to be a writer.");
    expect(firstSentence(ps[2].original)).toBe("See, despite the book sales and the fame, Bukowski was a loser.");
  });
});
