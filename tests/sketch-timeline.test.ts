import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  drawMs,
  frameAt,
  locateOnSubpaths,
  pencilAngle,
  SKETCH_EMPHASIS_MS,
  SKETCH_START_DELAY_MS,
  SKETCH_TOTAL_MS,
  visibleRatio,
  visibleThreshold,
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
  it("tổng 6000ms, trễ 450ms, nét chốt 1200ms", () => {
    expect(SKETCH_TOTAL_MS).toBe(6000);
    expect(SKETCH_START_DELAY_MS).toBe(450);
    expect(SKETCH_EMPHASIS_MS).toBe(1200);
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
    expect(Math.abs(tl.at(-1)!.t2 - SKETCH_TOTAL_MS)).toBeLessThan(1);
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
  it("bước có fixedMs vẽ đúng chừng đó, không bị co giãn; các bước khác chia phần còn lại, tổng vẫn đúng", () => {
    const withRing: MeasuredStep[] = [...steps, { kind: "path", rawMs: 800, fixedMs: 1200, start: [200, 60], end: [200, 61] }];
    const t = buildTimeline(withRing, home);
    const ring = t.at(-1)!;
    expect(ring.t2 - ring.t1).toBeCloseTo(1200);
    expect(Math.abs(ring.t2 - SKETCH_TOTAL_MS)).toBeLessThan(1);
    // phần co giãn của các bước khác giữ đúng tỉ lệ với nhau
    expect((t[2].t2 - t[2].t1) / (t[0].t2 - t[0].t1)).toBeCloseTo(steps[2].rawMs / steps[0].rawMs);
  });
  it("fixedMs vượt cả tổng: không ra thời gian âm", () => {
    const t = buildTimeline([{ kind: "path", rawMs: 100, start: [0, 0], end: [1, 1] }, { kind: "path", rawMs: 1, fixedMs: 9000, start: [0, 0], end: [1, 1] }], home);
    t.forEach((s) => {
      expect(s.t1).toBeGreaterThanOrEqual(s.t0);
      expect(s.t2).toBeGreaterThanOrEqual(s.t1);
    });
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

describe("locateOnSubpaths", () => {
  const lens = [100, 50, 50];

  it("p=0 → đầu đoạn đầu; p=1 → cuối đoạn cuối", () => {
    expect(locateOnSubpaths(lens, 0)).toEqual({ index: 0, at: 0 });
    expect(locateOnSubpaths(lens, 1)).toEqual({ index: 2, at: 50 });
  });

  it("phân bổ theo độ dài cộng dồn, không chia đều theo số đoạn", () => {
    expect(locateOnSubpaths(lens, 0.25)).toEqual({ index: 0, at: 50 });
    expect(locateOnSubpaths(lens, 0.6)).toEqual({ index: 1, at: 20 });
    expect(locateOnSubpaths(lens, 0.9)).toEqual({ index: 2, at: 30 });
  });

  it("đúng ranh giới thì còn ở đoạn vừa xong", () => {
    expect(locateOnSubpaths(lens, 0.5)).toEqual({ index: 0, at: 100 });
  });

  it("p ngoài khoảng 0..1 bị kẹp lại", () => {
    expect(locateOnSubpaths(lens, -1)).toEqual({ index: 0, at: 0 });
    expect(locateOnSubpaths(lens, 2)).toEqual({ index: 2, at: 50 });
  });

  it("độ dài toàn 0 hoặc không có đoạn nào: không chia cho 0", () => {
    expect(locateOnSubpaths([0, 0], 0.5)).toEqual({ index: 0, at: 0 });
    expect(locateOnSubpaths([], 0.5)).toEqual({ index: 0, at: 0 });
  });
});

describe("visibleThreshold", () => {
  it("cửa sổ đủ cao → 0,9", () => {
    expect(visibleThreshold(358, 900)).toBe(0.9);
    expect(visibleThreshold(358, 358)).toBe(0.9);
  });
  it("cửa sổ thấp hơn hình → hạ theo phần cửa sổ chứa được", () => {
    expect(visibleThreshold(1000, 500)).toBeCloseTo(0.45);
  });
  it("chưa đo được kích thước → vẫn 0,9", () => {
    expect(visibleThreshold(0, 900)).toBe(0.9);
    expect(visibleThreshold(358, 0)).toBe(0.9);
  });
});

describe("visibleRatio", () => {
  it("nằm trọn trong cửa sổ → 1", () => {
    expect(visibleRatio(100, 400, 900)).toBe(1);
  });
  it("lòi ra dưới hoặc trên một nửa → 0,5", () => {
    expect(visibleRatio(700, 1100, 900)).toBeCloseTo(0.5);
    expect(visibleRatio(-200, 200, 900)).toBeCloseTo(0.5);
  });
  it("đã cuộn quá hẳn hoặc chưa tới → 0", () => {
    expect(visibleRatio(-500, -100, 900)).toBe(0);
    expect(visibleRatio(1000, 1400, 900)).toBe(0);
  });
  it("chưa đo được kích thước (jsdom) → coi như thấy", () => {
    expect(visibleRatio(0, 0, 900)).toBe(1);
  });
});

describe("pencilAngle", () => {
  it("đầu nét ở xa mép trên: nghiêng -52°", () => {
    expect(pencilAngle(70)).toBe(-52);
    expect(pencilAngle(300)).toBe(-52);
  });
  it("càng gần mép trên càng nằm ngang, để thân bút không che hàng tiêu đề", () => {
    expect(pencilAngle(0)).toBe(-10);
    expect(pencilAngle(35)).toBeCloseTo(-31);
    expect(pencilAngle(-20)).toBe(-10);
  });
});
