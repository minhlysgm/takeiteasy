import { describe, expect, it } from "vitest";
import { bukowskiHead, heart } from "@/content/sketch-parts";

const nums = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
const cmds = (d: string) => d.replace(/[^a-zA-Z]/g, "");

// Chuỗi gốc trong mockup (đầu đặt ở 240, 92)
const MOCKUP = [
  "M216,80 L221,66 L227,76 L232,62 L238,74 L244,61 L249,73 L255,63 L259,76 L264,70",
  "M226,88 L238,89 M244,89 L256,88 M228,91 Q232,94 236,91 M246,91 Q250,94 254,91",
  "M241,94 Q237,101 243,102 M231,110 Q236,107 241,110 Q246,113 251,109",
  "M229,115 l.5,.5 M234,118 l.5,.5 M240,119 l.5,.5 M246,118 l.5,.5 M251,115 l.5,.5",
];

describe("bukowskiHead", () => {
  it("ở (240, 92, 1) ra đúng các nét của mockup", () => {
    const [head, ...rest] = bukowskiHead({ x: 240, y: 92 });
    expect(head).toMatchObject({ kind: "ellipse", cx: 240, cy: 92, w: 52, h: 56, seed: 3 });
    expect(rest).toHaveLength(MOCKUP.length);
    rest.forEach((s, i) => {
      if (s.kind !== "path") throw new Error("phải là path");
      expect(cmds(s.d)).toBe(cmds(MOCKUP[i]));
      expect(nums(s.d)).toEqual(nums(MOCKUP[i]));
    });
    expect(rest[0]).toMatchObject({ seed: 5, rough: 0.6 });
  });

  it("dời và co giãn tất định", () => {
    const a = bukowskiHead({ x: 100, y: 50, s: 0.5 });
    expect(a).toEqual(bukowskiHead({ x: 100, y: 50, s: 0.5 }));
    expect(a[0]).toMatchObject({ cx: 100, cy: 50, w: 26, h: 28 });
    // điểm đầu tiên của tóc: (216,80) → (100 + (216-240)*.5, 50 + (80-92)*.5)
    expect(nums((a[1] as { d: string }).d).slice(0, 2)).toEqual([88, 44]);
  });
});

describe("heart", () => {
  it("khép kín và tất định", () => {
    expect(heart(10, 10, 5)).toBe(heart(10, 10, 5));
    expect(heart(10, 10, 5).endsWith("Z")).toBe(true);
  });
});
