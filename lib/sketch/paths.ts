import rough from "roughjs";
import type { SketchStep } from "@/content/types";

// x1,y1, c1x,c1y, c2x,c2y, x2,y2
export type ArrowPoints = [number, number, number, number, number, number, number, number];

const DEFAULT_SEED = 1; // roughjs: seed 0 = ngẫu nhiên, nên không bao giờ dùng 0
const generator = rough.generator();

export function ellipsePath({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }): string {
  return `M${cx - w / 2},${cy} a${w / 2},${h / 2} 0 1,0 ${w},0 a${w / 2},${h / 2} 0 1,0 ${-w},0`;
}

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
  return `M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2} M${x2 + ax},${y2 + ay} L${x2},${y2} L${x2 + cx},${y2 + cy}`;
}

/** Làm tròn 2 chữ số thập phân: sin/cos của Node và trình duyệt lệch ở chữ số cuối, sẽ gây hydration mismatch. */
const roundNums = (d: string) => d.replace(/-?\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(2))));

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
