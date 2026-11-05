import rough from "roughjs";
import type { SketchStep } from "@/content/types";

// x1,y1, c1x,c1y, c2x,c2y, x2,y2
export type ArrowPoints = [number, number, number, number, number, number, number, number];

const DEFAULT_SEED = 1; // roughjs: seed 0 = ngẫu nhiên, nên không bao giờ dùng 0
const generator = rough.generator();

/** Làm tròn 2 chữ số thập phân: sin/cos của Node và trình duyệt lệch ở chữ số cuối, sẽ gây hydration mismatch. */
const roundNums = (d: string) => d.replace(/-?\d+\.\d+(?:e[-+]?\d+)?/g, (n) => String(Number(Number(n).toFixed(2))));

export function arrowPath([x1, y1, c1x, c1y, c2x, c2y, x2, y2]: ArrowPoints): string {
  const n = Math.hypot(x2 - c2x, y2 - c2y) || 1;
  const bx = (-(x2 - c2x) / n) * 8;
  const by = (-(y2 - c2y) / n) * 8;
  const rot = (a: number): [number, number] => [
    bx * Math.cos(a) - by * Math.sin(a),
    bx * Math.sin(a) + by * Math.cos(a),
  ];
  const [ax, ay] = rot(0.5);
  const [cx, cy] = rot(-0.5);
  return roundNums(`M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2} M${x2 + ax},${y2 + ay} L${x2},${y2} L${x2 + cx},${y2 + cy}`);
}

/** Số tham số của một lần lặp mỗi lệnh path */
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 };
const NUM = /[\s,]*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/y;
const ARC_FLAG = /[\s,]*([01])/y; // cờ của lệnh a có thể viết liền: "0 0110,0"

function readArgs(lower: string, args: string): number[] {
  const out: number[] = [];
  let pos = 0;
  for (;;) {
    const i = out.length % 7;
    const re = lower === "a" && (i === 3 || i === 4) ? ARC_FLAG : NUM;
    re.lastIndex = pos;
    const m = re.exec(args);
    if (!m) return out;
    out.push(Number(m[1]));
    pos = re.lastIndex;
  }
}

const fmt = (n: number) => String(Number(n.toFixed(3)));

/**
 * Tách `d` thành các subpath, mỗi subpath một chuỗi độc lập. Trình duyệt tính lại nét đứt từ đầu ở mỗi
 * subpath, nên vẽ bằng dash trên một `d` nhiều M thì mọi đoạn mọc cùng lúc.
 */
export function splitSubpaths(d: string): string[] {
  const subs: string[] = [];
  let [x, y, startX, startY] = [0, 0, 0, 0];
  let afterClose = false;

  for (const [, cmd, args] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;

    if (lower === "z") {
      subs[subs.length - 1] += cmd + args;
      [x, y] = [startX, startY];
      afterClose = true;
      continue;
    }

    const nums = readArgs(lower, args);
    let from = 0;
    if (lower === "m") {
      const relative = rel && subs.length > 0; // m đầu tiên của cả chuỗi tính như M
      [x, y] = relative ? [x + nums[0], y + nums[1]] : [nums[0], nums[1]];
      [startX, startY] = [x, y];
      // Cặp số thừa sau m là l tương đối; M đứng một mình thì đổi nghĩa, nên phải viết rõ chữ l
      const rest = nums.slice(2).join(" ");
      subs.push(relative ? `M${fmt(x)},${fmt(y)} ${rest ? `l${rest} ` : ""}` : cmd + args);
      from = 2;
    } else {
      if (afterClose || !subs.length) subs.push(`M${fmt(x)},${fmt(y)} `);
      subs[subs.length - 1] += cmd + args;
    }
    afterClose = false;

    for (let i = from, n = ARITY[lower]; i + n <= nums.length; i += n) {
      const a = nums.slice(i, i + n);
      const dx = rel ? x : 0;
      const dy = rel ? y : 0;
      if (lower === "h") x = dx + a[0];
      else if (lower === "v") y = dy + a[0];
      else [x, y] = [dx + a[n - 2], dy + a[n - 1]];
    }
  }
  return subs.map((s) => s.trim());
}

export function stepPaths(step: Extract<SketchStep, { kind: "path" | "ellipse" | "arrow" }>): string[] {
  if (step.kind === "arrow") return [arrowPath(step.points)];
  if (step.kind === "path" && step.plain) return [step.d];

  const opts = {
    roughness: step.rough ?? 0.9,
    bowing: 0.8,
    seed: step.seed || DEFAULT_SEED,
    strokeWidth: step.kind === "path" ? (step.width ?? 2) : 2,
    disableMultiStroke: !(step.kind === "ellipse" && step.multi),
  };
  const drawable =
    step.kind === "ellipse"
      ? generator.ellipse(step.cx, step.cy, step.w, step.h, opts)
      : generator.path(step.d, opts);
  return generator.toPaths(drawable).map((p) => roundNums(p.d));
}
