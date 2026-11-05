import type { Sketch } from "@/content/types";
import { bukowskiHead, heart } from "@/content/sketch-parts";

/** Hình phác thảo từng đoạn của chương 1, port từ mockup docs/superpowers/specs/2026-11-05-passage-sketch-mockup.html */
export const ch01Sketches: Record<"p01", Sketch> = {
  p01: {
    viewBox: "0 0 480 330",
    alt: "Phác thảo: Charles Bukowski cầm chai rượu (alcoholic), trái tim (womanizer), xúc xắc (chronic gambler), tờ thơ (a poet, on his worst days); vòng tròn khoanh ông lại kèm chữ the perfect place to start.",
    steps: [
      // Bukowski
      ...bukowskiHead({ x: 240, y: 92 }),
      { kind: "path", d: "M240,120 C237,145 235,172 238,200", tone: "line", seed: 7 },
      { kind: "path", d: "M239,138 C226,148 214,158 201,170", tone: "line", seed: 8 },
      { kind: "path", d: "M239,138 C254,148 266,156 282,164", tone: "line", seed: 9 },
      { kind: "path", d: "M238,200 L221,254 L210,257", tone: "line", seed: 10 },
      { kind: "path", d: "M238,200 L259,254 L271,256", tone: "line", seed: 11 },
      { kind: "text", text: "Charles Bukowski", x: 240, y: 290, size: 21, anchor: "middle", tone: "name" },
      { kind: "path", d: "M170,298 C205,302 278,301 310,296", tone: "ink", seed: 12 },
      // alcoholic
      { kind: "path", d: "M189,146 L194,146 L194,158 L200,166 L200,198 L183,198 L183,166 L189,158 Z", tone: "line", seed: 13, rough: 0.6 },
      { kind: "path", d: "M186,178 L197,178 M186,186 L197,186", tone: "line", plain: true, width: 1.6 },
      { kind: "text", text: "alcoholic", x: 56, y: 138, size: 20, tone: "ink" },
      { kind: "arrow", points: [136, 134, 156, 134, 170, 144, 179, 158], tone: "ink" },
      // womanizer
      { kind: "path", d: heart(284, 64, 9), tone: "line", seed: 14, rough: 0.5 },
      { kind: "path", d: heart(302, 45, 6), tone: "line", seed: 15, rough: 0.4 },
      { kind: "text", text: "womanizer", x: 322, y: 66, size: 20, tone: "ink" },
      // chronic gambler
      { kind: "path", d: "M286,170 L302,166 L306,182 L290,186 Z", tone: "line", seed: 16, rough: 0.6 },
      { kind: "path", d: "M292.7,174 l.5,.5 M299.3,178 l.5,.5", tone: "line", plain: true, width: 2.8 },
      { kind: "path", d: "M304,192 L320,195 L317,211 L301,208 Z", tone: "line", seed: 17, rough: 0.6 },
      { kind: "path", d: "M307.2,196.8 l.5,.5 M310.5,201.5 l.5,.5 M313.8,206.2 l.5,.5", tone: "line", plain: true, width: 2.8 },
      { kind: "text", text: "chronic gambler", x: 318, y: 150, size: 20, tone: "ink" },
      { kind: "arrow", points: [336, 156, 332, 163, 322, 166, 309, 169], tone: "ink" },
      // poet
      { kind: "path", d: "M68,214 L108,208 L114,250 L74,256 Z", tone: "line", seed: 18, rough: 0.7 },
      { kind: "path", d: "M76,223 L101,219 M77,231 L102,227 M78,239 L95,236", tone: "line", plain: true, width: 1.5 },
      { kind: "path", d: "M114,262 L138,231 M138,231 L144,225", tone: "line", seed: 19, rough: 0.5 },
      { kind: "text", text: "a poet", x: 44, y: 282, size: 20, tone: "ink" },
      { kind: "text", text: "(on his worst days)", x: 30, y: 302, size: 16, tone: "ink" },
      // các thói còn lại
      { kind: "text", text: "+ lout · cheapskate · deadbeat", x: 14, y: 30, size: 17, tone: "muted" },
      { kind: "pause", ms: 380 },
      // cú lật: khoanh tròn + "perfect place to start"
      { kind: "ellipse", cx: 240, cy: 156, w: 138, h: 206, tone: "ink", seed: 21, rough: 1.2, multi: true },
      { kind: "arrow", points: [392, 296, 394, 262, 344, 240, 296, 236], tone: "ink" },
      { kind: "text", text: "the perfect place to start", x: 450, y: 320, size: 20, anchor: "end", tone: "ink" },
      { kind: "path", d: "M456,311 L462,318 L475,300", tone: "ink", seed: 22, rough: 0.5, width: 2.4 },
    ],
  },
};
