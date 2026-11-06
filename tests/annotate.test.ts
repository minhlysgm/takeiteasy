import { describe, expect, it } from "vitest";
import { buildEdgeArrow, layoutNotes, pickNoteSide } from "@/lib/annotate";

/** Toạ độ mọi điểm trong path (M/C) — để kiểm cả điểm điều khiển, vì đường cong nằm trong bao lồi của chúng. */
const points = (d: string) => {
  const n = d.replace(/[MC,]/g, " ").trim().split(/\s+/).map(Number);
  return Array.from({ length: n.length / 2 }, (_, i) => ({ x: n[2 * i], y: n[2 * i + 1] }));
};

describe("buildEdgeArrow", () => {
  it("đi từ ghi chú tới đúng điểm đích", () => {
    const d = buildEdgeArrow({ x: 150, y: 120 }, { x: 182, y: 130 });
    expect(d.startsWith("M 150 120 C ")).toBe(true);
    expect(d.endsWith("182 130")).toBe(true);
  });
  for (const [name, from, to] of [
    ["lề trái", { x: 150, y: 120 }, { x: 182, y: 140 }],
    ["lề phải", { x: 880, y: 160 }, { x: 842, y: 130 }],
  ] as const) {
    it(`${name}: mọi điểm (cả điểm điều khiển) nằm giữa ghi chú và mép cột — không đi vào vùng chữ`, () => {
      const xs = points(buildEdgeArrow(from, to)).map((p) => p.x);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(Math.min(from.x, to.x));
      expect(Math.max(...xs)).toBeLessThanOrEqual(Math.max(from.x, to.x));
    });
    it(`${name}: đoạn cuối nằm ngang (đầu mũi tên chỉ thẳng vào dòng)`, () => {
      const ps = points(buildEdgeArrow(from, to));
      expect(ps[ps.length - 2].y).toBe(to.y);
    });
  }
});

describe("pickNoteSide", () => {
  const col = { left: 200, right: 840 };
  const r = (left: number, right: number, top: number) => ({ left, right, top, bottom: top + 32 });

  it("cụm gần mép trái → lề trái, dòng chứa rect đầu", () => {
    expect(pickNoteSide([r(230, 330, 100)], col)).toEqual({ side: "left", line: r(230, 330, 100) });
  });
  it("cụm gần mép phải → lề phải", () => {
    expect(pickNoteSide([r(700, 820, 100)], col)).toEqual({ side: "right", line: r(700, 820, 100) });
  });
  it("cụm xuống dòng: so đầu cụm (rect đầu) với mép trái, cuối cụm (rect cuối) với mép phải", () => {
    // đầu cụm ở cuối dòng 1 (cách mép trái 500), cuối cụm ở đầu dòng 2 (cách mép phải 560):
    // khung bao cả cụm phủ hết bề ngang, nhưng xét từng rect thì đầu cụm gần mép trái hơn → lề trái, ngang dòng 1
    const first = r(700, 840, 100);
    const last = r(200, 280, 132);
    expect(pickNoteSide([first, last], col)).toEqual({ side: "left", line: first });
    // đầu cụm lọt giữa dòng, cuối cụm sát mép phải → lề phải, ngang dòng 2
    const first2 = r(500, 840, 100);
    const last2 = r(200, 800, 132);
    expect(pickNoteSide([first2, last2], col)).toEqual({ side: "right", line: last2 });
  });
  it("hoà khoảng cách thì chọn lề trái", () => {
    expect(pickNoteSide([r(300, 740, 100)], col).side).toBe("left");
  });
});

describe("layoutNotes", () => {
  it("giữ nguyên khi không đè nhau", () => {
    expect(layoutNotes([
      { id: "a", y: 0, height: 50 },
      { id: "b", y: 100, height: 50 },
    ])).toEqual({ a: 0, b: 100 });
  });
  it("đẩy ghi chú sau xuống khi đè nhau (kèm gap)", () => {
    const out = layoutNotes([
      { id: "a", y: 0, height: 50 },
      { id: "b", y: 20, height: 50 },
    ], 10);
    expect(out.a).toBe(0);
    expect(out.b).toBe(60); // 0 + 50 + 10
  });
  it("input không cần sort sẵn", () => {
    const out = layoutNotes([
      { id: "b", y: 20, height: 50 },
      { id: "a", y: 0, height: 50 },
    ], 10);
    expect(out.a).toBe(0);
    expect(out.b).toBe(60);
  });
});
