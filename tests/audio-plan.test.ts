import { describe, expect, it } from "vitest";
import { audioTexts } from "@/lib/audio/texts";
import { planAudio } from "@/lib/audio/plan";
import { audioPath } from "@/lib/audio/audioPath";
import { VOICES } from "@/lib/audio/voices";
import { books, getPassages } from "@/lib/content";

describe("planAudio", () => {
  const items = [
    { voice: "will" as const, text: "One.", label: "a" },
    { voice: "will" as const, text: "Two words.", label: "b" },
    { voice: "brian" as const, text: "Three words here.", label: "c" },
  ];

  it("chỉ giữ câu chưa có file, tính tổng ký tự của các câu đó", () => {
    const existing = new Set([audioPath("will", "One.")]);
    const plan = planAudio(items, existing);
    expect(plan.todo.map((t) => t.label)).toEqual(["b", "c"]);
    expect(plan.chars).toBe("Two words.".length + "Three words here.".length);
    expect(plan.orphans).toEqual([]);
  });

  it("file có sẵn mà không câu nào dùng → file thừa", () => {
    const stray = "/audio/will/0000000000000000.mp3";
    const existing = new Set([audioPath("will", "One."), stray]);
    expect(planAudio(items, existing).orphans).toEqual([stray]);
  });

  it("đủ file hết → không còn việc", () => {
    const existing = new Set(items.map((i) => audioPath(i.voice, i.text)));
    expect(planAudio(items, existing)).toEqual({ todo: [], orphans: [], chars: 0 });
  });
});

describe("audioTexts", () => {
  const all = audioTexts();
  const sentences = new Set<string>();
  for (const b of books)
    for (const ch of b.chapters)
      for (const p of getPassages(b.id, ch.id) ?? []) {
        sentences.add(p.caption);
        for (const c of p.chunks) for (const e of c.examples) sentences.add(e.en);
      }

  it("mỗi câu × 5 giọng + 5 câu nghe thử, không trùng đường dẫn", () => {
    expect(all).toHaveLength(sentences.size * VOICES.length + VOICES.length);
    const paths = all.map((a) => audioPath(a.voice, a.text));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("có caption, ví dụ và câu nghe thử, nhãn đúng dạng", () => {
    const labels = all.map((a) => a.label);
    expect(labels).toContain("ch01-p01 mô tả");
    expect(labels).toContain("ch01-p01 is-a-mess ví dụ 1");
    expect(labels).toContain("nghe thử Will");
    const will = VOICES.find((v) => v.id === "will")!;
    expect(all).toContainEqual({ voice: "will", text: will.sample, label: "nghe thử Will" });
    // câu nghe thử của giọng nào chỉ có ở giọng đó
    expect(all.filter((a) => a.text === will.sample).map((a) => a.voice)).toEqual(["will"]);
  });
});
