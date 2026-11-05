export type Pt = [number, number];

export const SKETCH_TOTAL_MS = 5600;
export const SKETCH_START_DELAY_MS = 450;

export interface MeasuredStep {
  kind: "path" | "text" | "pause";
  /** path/text: thời gian vẽ thô (xem drawMs); pause: thời gian dừng */
  rawMs: number;
  start: Pt;
  end: Pt;
}

/** t0→t1 nhấc bút di chuyển, t1→t2 vẽ */
export interface TimedStep extends MeasuredStep {
  from: Pt;
  t0: number;
  t1: number;
  t2: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** path: size = độ dài nét; text: size = số ký tự. `plain` chỉ ảnh hưởng mức tối thiểu của path. */
export function drawMs(kind: "path" | "text", size: number, plain = false): number {
  if (kind === "path") return clamp(size * 2.3, plain ? 140 : 110, 800);
  return clamp(size * 38, 260, 800);
}

export function buildTimeline(
  steps: MeasuredStep[],
  home: Pt,
  totalMs: number = SKETCH_TOTAL_MS,
): TimedStep[] {
  let prev = home;
  const raw = steps.map((s) => {
    const from = prev;
    const isPause = s.kind === "pause";
    const start: Pt = isPause ? from : s.start;
    const end: Pt = isPause ? from : s.end;
    const travel = isPause
      ? 0
      : clamp(Math.hypot(start[0] - from[0], start[1] - from[1]) * 1.3, 50, 200);
    prev = end;
    return { ...s, from, start, end, travel };
  });

  const sum = raw.reduce((a, s) => a + s.travel + s.rawMs, 0);
  const k = sum > 0 ? totalMs / sum : 0;

  let t = 0;
  return raw.map(({ travel, ...s }) => {
    const t0 = t;
    const t1 = t0 + travel * k;
    const t2 = t1 + s.rawMs * k;
    t = t2;
    return { ...s, t0, t1, t2 };
  });
}

/**
 * Một bước có thể gồm nhiều đoạn con, vẽ lần lượt. Đổi tiến độ p (0→1) của cả bước thành
 * đoạn đang vẽ và độ dài đã vẽ trên đoạn đó, theo độ dài cộng dồn.
 */
export function locateOnSubpaths(lengths: number[], p: number): { index: number; at: number } {
  let rest = lengths.reduce((a, l) => a + l, 0) * clamp(p, 0, 1);
  for (let i = 0; i < lengths.length; i++) {
    if (rest <= lengths[i]) return { index: i, at: rest };
    rest -= lengths[i];
  }
  // sai số làm tròn số thực có thể làm `rest` vượt đoạn cuối một chút
  return lengths.length ? { index: lengths.length - 1, at: lengths[lengths.length - 1] } : { index: 0, at: 0 };
}

export function frameAt(
  tl: TimedStep[],
  t: number,
): { index: number; phase: "travel" | "draw" | "done"; progress: number } {
  for (let i = 0; i < tl.length; i++) {
    const s = tl[i];
    if (t < s.t1) {
      return { index: i, phase: "travel", progress: s.t1 > s.t0 ? Math.max(0, (t - s.t0) / (s.t1 - s.t0)) : 1 };
    }
    if (t < s.t2) {
      return { index: i, phase: "draw", progress: (t - s.t1) / (s.t2 - s.t1) };
    }
  }
  return { index: tl.length, phase: "done", progress: 1 };
}
