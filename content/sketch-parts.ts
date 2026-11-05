import type { SketchStep } from "./types";

/** Chuỗi `d` của trái tim tâm (cx, cy), cỡ s. */
export function heart(cx: number, cy: number, s: number): string {
  return `M${cx},${cy + s} C${cx - s * 1.4},${cy} ${cx - s},${cy - s * 1.1} ${cx},${cy - s * 0.35} C${cx + s},${cy - s * 1.1} ${cx + s * 1.4},${cy} ${cx},${cy + s} Z`;
}

// Đầu vẽ sẵn quanh tâm (240, 92) với tỉ lệ 1, lấy từ mockup.
const BASE = { x: 240, y: 92 };
const HEAD_PATHS: { d: string; seed?: number; rough?: number; plain?: boolean; width?: number }[] = [
  // tóc rối
  { d: "M216,80 L221,66 L227,76 L232,62 L238,74 L244,61 L249,73 L255,63 L259,76 L264,70", seed: 5, rough: 0.6 },
  // mắt lờ đờ
  { d: "M226,88 L238,89 M244,89 L256,88 M228,91 Q232,94 236,91 M246,91 Q250,94 254,91", plain: true, width: 1.8 },
  // mũi + miệng
  { d: "M241,94 Q237,101 243,102 M231,110 Q236,107 241,110 Q246,113 251,109", plain: true, width: 1.8 },
  // râu lún phún
  { d: "M229,115 l.5,.5 M234,118 l.5,.5 M240,119 l.5,.5 M246,118 l.5,.5 M251,115 l.5,.5", plain: true, width: 2.6 },
];

const num = (n: number) => String(Number(n.toFixed(2)));

/**
 * Đổi toạ độ của chuỗi `d`: lệnh viết hoa (tuyệt đối) được tịnh tiến + co giãn quanh tâm BASE,
 * lệnh viết thường (tương đối) chỉ co giãn. Chỉ hỗ trợ M/L/C/Q/Z — đủ cho phần đầu.
 */
function transformD(d: string, x: number, y: number, s: number): string {
  const out: string[] = [];
  for (const [, cmd, args] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
    if (!/[MLCQZmlcqz]/.test(cmd)) throw new Error(`transformD: lệnh "${cmd}" chưa hỗ trợ`);
    const nums = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const abs = cmd === cmd.toUpperCase();
    const pairs: string[] = [];
    for (let i = 0; i < nums.length; i += 2) {
      const px = abs ? x + (nums[i] - BASE.x) * s : nums[i] * s;
      const py = abs ? y + (nums[i + 1] - BASE.y) * s : nums[i + 1] * s;
      pairs.push(`${num(px)},${num(py)}`);
    }
    out.push(cmd + pairs.join(" "));
  }
  return out.join(" ");
}

/** Đầu Bukowski: đầu, tóc rối, mắt lờ đờ, mũi + miệng, râu lún phún. (x, y) = tâm đầu, s = tỉ lệ. */
export function bukowskiHead({ x, y, s = 1 }: { x: number; y: number; s?: number }): SketchStep[] {
  return [
    { kind: "ellipse", cx: x, cy: y, w: 52 * s, h: 56 * s, tone: "line", seed: 3 },
    ...HEAD_PATHS.map(
      ({ d, ...rest }): SketchStep => ({ kind: "path", d: transformD(d, x, y, s), tone: "line", ...rest }),
    ),
  ];
}
