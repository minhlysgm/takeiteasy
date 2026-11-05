import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  drawMs,
  frameAt,
  SKETCH_START_DELAY_MS,
  SKETCH_TOTAL_MS,
  type MeasuredStep,
  type Pt,
} from "@/lib/sketch/timeline";

const home: Pt = [0, 0];
const steps: MeasuredStep[] = [
  { kind: "path", rawMs: drawMs("path", 120), start: [10, 10], end: [130, 10] },
  { kind: "pause", rawMs: 380, start: [0, 0], end: [0, 0] },
  { kind: "text", rawMs: drawMs("text", 8), start: [20, 60], end: [180, 60] },
];

describe("hằng số", () => {
  it("tổng 5600ms, trễ 450ms", () => {
    expect(SKETCH_TOTAL_MS).toBe(5600);
    expect(SKETCH_START_DELAY_MS).toBe(450);
  });
});

describe("drawMs", () => {
  it("path kẹp tối thiểu 110 (140 nếu plain) và tối đa 800", () => {
    expect(drawMs("path", 10)).toBe(110);
    expect(drawMs("path", 10, true)).toBe(140);
    expect(drawMs("path", 1000)).toBe(800);
    expect(drawMs("path", 100)).toBeCloseTo(230);
  });
  it("text kẹp 260..800, 38ms mỗi ký tự", () => {
    expect(drawMs("text", 3)).toBe(260);
    expect(drawMs("text", 10)).toBe(380);
    expect(drawMs("text", 100)).toBe(800);
  });
});

describe("buildTimeline", () => {
  const tl = buildTimeline(steps, home);

  it("bước cuối kết thúc đúng totalMs", () => {
    expect(Math.abs(tl.at(-1)!.t2 - 5600)).toBeLessThan(1);
    const tl2 = buildTimeline(steps, home, 3000);
    expect(Math.abs(tl2.at(-1)!.t2 - 3000)).toBeLessThan(1);
  });
  it("mốc t0 ≤ t1 ≤ t2 và tăng đều giữa các bước", () => {
    tl.forEach((s, i) => {
      expect(s.t0).toBeLessThanOrEqual(s.t1);
      expect(s.t1).toBeLessThanOrEqual(s.t2);
      if (i > 0) expect(s.t0).toBeCloseTo(tl[i - 1].t2);
    });
    expect(tl[0].t0).toBe(0);
  });
  it("bước pause không di chuyển: t1 === t0, start = end = from", () => {
    expect(tl[1].t1).toBe(tl[1].t0);
    expect(tl[1].start).toEqual(tl[1].from);
    expect(tl[1].end).toEqual(tl[1].from);
  });
  it("from là end của bước trước, bước đầu là home", () => {
    expect(tl[0].from).toEqual(home);
    expect(tl[1].from).toEqual(steps[0].end);
    expect(tl[2].from).toEqual(steps[0].end);
  });
  it("danh sách rỗng ra mảng rỗng", () => {
    expect(buildTimeline([], home)).toEqual([]);
  });
});

describe("frameAt", () => {
  const tl = buildTimeline(steps, home);
  it("t=0 là travel của bước đầu", () => {
    const f = frameAt(tl, 0);
    expect(f.phase).toBe("travel");
    expect(f.index).toBe(0);
    expect(f.progress).toBe(0);
  });
  it("giữa t1..t2 là draw, progress trong [0,1]", () => {
    const mid = (tl[0].t1 + tl[0].t2) / 2;
    const f = frameAt(tl, mid);
    expect(f.phase).toBe("draw");
    expect(f.index).toBe(0);
    expect(f.progress).toBeCloseTo(0.5);
  });
  it("sang bước kế khi qua t2", () => {
    expect(frameAt(tl, tl[0].t2).index).toBe(1);
  });
  it("quá cuối thì done", () => {
    expect(frameAt(tl, 99999)).toEqual({ index: 3, phase: "done", progress: 1 });
    expect(frameAt([], 0).phase).toBe("done");
    expect(frameAt([], 0)).toEqual({ index: 0, phase: "done", progress: 1 });
  });
});
