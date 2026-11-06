import { describe, expect, it } from "vitest";
import { books, findChunkRange, firstSentence, getPassages } from "@/lib/content";
import type { Passage } from "@/content/types";
import { ch01Passages } from "@/content/books/the-subtle-art/ch01";
import { SKETCH_TEXT_SIZE } from "@/lib/sketch/style";

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
            expect(findChunkRange(p.caption, c), `chunk "${c.id}" — match "${c.match}" không có trong caption`).not.toBeNull();
            expect(c.examples.length, `chunk "${c.id}" thiếu examples`).toBeGreaterThan(0);
          }
        });
        it(`${p.id}: có sketch hợp lệ`, () => {
          expect(p.sketch, "thiếu sketch").toBeDefined();
          const { alt, viewBox, steps } = p.sketch;
          expect(alt.length, "alt quá ngắn").toBeGreaterThan(10);
          expect(viewBox).toMatch(/^0 0 \d+ \d+$/);
          expect(steps.some((s) => s.kind === "text"), "thiếu bước text").toBe(true);
          expect(steps.some((s) => s.kind === "path" || s.kind === "ellipse" || s.kind === "arrow"), "thiếu nét vẽ").toBe(true);
          for (const s of steps) {
            if ("seed" in s && s.seed !== undefined) expect(Number.isInteger(s.seed), `seed ${s.seed} không nguyên`).toBe(true);
            // Chữ tay cỡ 21 đơn vị: hình thu về ~358px trên màn 390px vẫn còn ~14.5px, đọc được
            if (s.kind === "text") expect(s.size, `chữ "${s.text}" cỡ ${s.size}`).toBe(SKETCH_TEXT_SIZE);
          }
        });
      }
    }
  }
});

const BANNED = ["a womanizer, a chronic gambler", "the perfect place to start", "rejection slips piled up",
  "Crude.", "Depraved.", "look to for life advice", "alcohol-fueled depression"];
const sketchTexts = (p: Passage) => p.sketch.steps.flatMap((s) => (s.kind === "text" ? [s.text] : []));

describe("ch01: thẻ vẽ trước (caption do takeiteasy viết)", () => {
  for (const p of ch01Passages) {
    it(`${p.id}: mỗi chunk.match nằm trong caption`, () => {
      for (const c of p.chunks) expect(p.caption).toContain(c.match);
    });
    it(`${p.id}: 3–5 câu, 4 chunk, mỗi chunk ≥ 2 ví dụ, có hình + alt`, () => {
      const sentences = p.caption.split(/(?<=[.?!])\s+/).length;
      expect(sentences).toBeGreaterThanOrEqual(3);
      expect(sentences).toBeLessThanOrEqual(5);
      expect(p.chunks).toHaveLength(4);
      for (const c of p.chunks) expect(c.examples.length).toBeGreaterThanOrEqual(2);
      expect(p.sketch.steps.length).toBeGreaterThan(0);
      expect(p.sketch.alt).not.toBe("");
    });
    it(`${p.id}: không còn câu chữ sách cũ`, () => {
      for (const b of BANNED) {
        expect(p.caption).not.toContain(b);
        for (const t of sketchTexts(p)) expect(t).not.toContain(b);
      }
    });
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
  it("firstSentence: dấu đóng ’ ' ) sau dấu chấm vẫn là hết câu", () => {
    expect(firstSentence("‘Try harder.’ he said. Then left.")).toBe("‘Try harder.’");
    expect(firstSentence("'Go home.' Then left.")).toBe("'Go home.'");
    expect(firstSentence("(It was late.) We left.")).toBe("(It was late.)");
  });
  it("firstSentence: không cắt ở chữ viết tắt (Mr. Dr. e.g. …)", () => {
    expect(firstSentence("Mr. Bukowski wrote poems. Then he drank.")).toBe("Mr. Bukowski wrote poems.");
    expect(firstSentence("Dr. Smith and Mrs. Lee met, e.g. at lunch. Later on.")).toBe("Dr. Smith and Mrs. Lee met, e.g. at lunch.");
  });
  it("firstSentence: bỏ qua dòng trống đầu đoạn", () => {
    expect(firstSentence("\n  \nFirst real line. Second.")).toBe("First real line.");
  });
  it("firstSentence: dấu chấm giữa số không phải hết câu", () => {
    expect(firstSentence("It cost 3.5 dollars. Cheap.")).toBe("It cost 3.5 dollars.");
  });
  it("firstSentence của 3 đoạn ch01 khớp mockup", () => {
    const ps = getPassages("the-subtle-art", "ch01")!;
    expect(firstSentence(ps[0].caption)).toBe("This is Charles Bukowski, and his life is a mess.");
    expect(firstSentence(ps[1].caption)).toBe("It’s three in the morning and she still can’t fall asleep.");
    expect(firstSentence(ps[2].caption)).toBe("He chases happiness the way a kid chases a balloon.");
  });
});
