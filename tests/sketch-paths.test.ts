import { describe, expect, it } from "vitest";
import { arrowPath, ellipsePath, stepPaths } from "@/lib/sketch/paths";

describe("arrowPath", () => {
  it("vẽ đường cong rồi đầu mũi tên quay về điểm cuối", () => {
    const d = arrowPath([0, 0, 10, 0, 20, 0, 30, 0]);
    expect(d.startsWith("M0,0 C")).toBe(true);
    expect(d).toContain("L30,0");
  });
});

describe("ellipsePath", () => {
  it("bắt đầu ở mép trái của hình elip", () => {
    expect(ellipsePath({ cx: 50, cy: 50, w: 40, h: 20 }).startsWith("M30,50")).toBe(true);
  });
});

describe("stepPaths", () => {
  it("path: tất định theo seed, khác đường gốc", () => {
    const step = { kind: "path", d: "M0,0 L100,0", tone: "line", seed: 7 } as const;
    const a = stepPaths(step);
    const b = stepPaths(step);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a).not.toEqual(["M0,0 L100,0"]);
  });

  it("path: không seed vẫn tất định", () => {
    const step = { kind: "path", d: "M0,0 L100,0", tone: "ink" } as const;
    expect(stepPaths(step)).toEqual(stepPaths(step));
  });

  it("plain: trả nguyên đường gốc", () => {
    expect(stepPaths({ kind: "path", d: "M1,1 l.5,.5", tone: "line", plain: true })).toEqual(["M1,1 l.5,.5"]);
  });

  it("ellipse: có ít nhất một nét", () => {
    const out = stepPaths({ kind: "ellipse", cx: 50, cy: 50, w: 40, h: 20, tone: "ink", seed: 3, multi: true });
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("arrow: trả đúng một đường", () => {
    const out = stepPaths({ kind: "arrow", points: [0, 0, 10, 0, 20, 0, 30, 0], tone: "ink" });
    expect(out).toHaveLength(1);
  });
});
