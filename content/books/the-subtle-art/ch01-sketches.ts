import type { Sketch } from "@/content/types";
import { bukowskiHead, heart } from "@/content/sketch-parts";

/** Hình phác thảo từng đoạn của chương 1. p01 port từ mockup docs/superpowers/specs/2026-11-05-passage-sketch-mockup.html */
export const ch01Sketches: Record<"p01" | "p02" | "p03", Sketch> = {
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
      { kind: "text", text: "+ lout · cheapskate · deadbeat", x: 14, y: 30, size: 17, tone: "line" },
      { kind: "pause", ms: 380 },
      // cú lật: khoanh tròn + "perfect place to start"
      { kind: "ellipse", cx: 240, cy: 156, w: 138, h: 206, tone: "ink", seed: 21, rough: 1.2, multi: true },
      { kind: "arrow", points: [392, 296, 394, 262, 344, 240, 296, 236], tone: "ink" },
      { kind: "text", text: "the perfect place to start", x: 450, y: 320, size: 20, anchor: "end", tone: "ink" },
      { kind: "path", d: "M456,311 L462,318 L475,300", tone: "ink", seed: 22, rough: 0.5, width: 2.4 },
    ],
  },
  p02: {
    viewBox: "0 0 480 330",
    alt: "Phác thảo: Bukowski ngồi trước máy chữ, bên cạnh là chai rượu (alcohol-fueled); chồng giấy đóng dấu REJECTED cao dần (rejection slips piled up, for decades); những lời chê Crude, Disgusting, Depraved rơi quanh ông, mây đen trên đầu; mũi tên lớn (the weight of his failures) đè xuống kèm chữ deep into depression.",
    steps: [
      // Bukowski ngồi bên máy chữ
      ...bukowskiHead({ x: 120, y: 100 }),
      { kind: "path", d: "M120,128 C119,136 120,146 120,154", tone: "line", seed: 31 },
      { kind: "path", d: "M120,142 L86,164 L100,182 M120,142 L154,164 L140,182", tone: "line", seed: 32 },
      { kind: "path", d: "M40,205 C90,203 160,206 208,204 M52,205 L52,282 M196,205 L196,282", tone: "line", seed: 33, rough: 0.6 },
      { kind: "path", d: "M96,178 L144,178 L154,205 L86,205 Z", tone: "line", seed: 34, rough: 0.6 },
      { kind: "path", d: "M107,178 L108,154 L133,154 L134,178", tone: "line", seed: 35, rough: 0.5 },
      { kind: "path", d: "M112,162 L128,162 M112,169 L125,169 M98,188 L142,188 M95,196 L145,196", tone: "line", plain: true, width: 1.4 },
      { kind: "path", d: "M120,207 L120,222 L98,246 L96,282 L84,284 M120,222 L142,246 L144,282 L156,284", tone: "line", seed: 36 },
      { kind: "path", d: "M16,284 C80,281 160,286 208,283 M262,283 C320,281 400,286 462,282", tone: "line", seed: 37, rough: 0.5 },
      { kind: "text", text: "Bukowski", x: 110, y: 308, size: 20, anchor: "middle", tone: "name" },
      // chai rượu
      { kind: "path", d: "M64,153 L69,153 L69,165 L75,173 L75,205 L58,205 L58,173 L64,165 Z", tone: "line", seed: 38, rough: 0.6 },
      { kind: "text", text: "alcohol-fueled", x: 8, y: 142, size: 17, tone: "ink" },
      // chồng giấy cao dần
      { kind: "path", d: "M266,244 L352,246 L354,282 L264,282 Z M266,256 L353,257 M265,269 L354,270", tone: "line", seed: 39, rough: 0.6 },
      { kind: "path", d: "M270,206 L356,204 L352,246 L266,244 Z", tone: "line", seed: 40, rough: 0.6 },
      { kind: "text", text: "REJECTED", x: 311, y: 232, size: 18, anchor: "middle", tone: "ink" },
      { kind: "path", d: "M264,170 L348,168 L356,204 L270,206 Z M267,181 L351,179 M268,192 L353,191", tone: "line", seed: 41, rough: 0.6 },
      { kind: "path", d: "M270,130 L354,132 L348,168 L264,170 Z", tone: "line", seed: 42, rough: 0.6 },
      { kind: "text", text: "REJECTED", x: 309, y: 156, size: 18, anchor: "middle", tone: "ink" },
      { kind: "path", d: "M266,96 L350,92 L354,132 L270,130 Z M267,108 L351,105 M269,119 L352,118", tone: "line", seed: 43, rough: 0.6 },
      { kind: "text", text: "rejection slips piled up", x: 262, y: 82, size: 20, tone: "ink" },
      { kind: "arrow", points: [368, 278, 372, 220, 368, 160, 370, 100], tone: "ink" },
      { kind: "text", text: "for decades", x: 378, y: 196, size: 18, tone: "ink" },
      // lời chê rơi quanh
      { kind: "text", text: "Crude.", x: 158, y: 88, size: 19, tone: "ink" },
      { kind: "text", text: "Disgusting.", x: 10, y: 96, size: 19, tone: "ink" },
      { kind: "text", text: "Depraved.", x: 152, y: 138, size: 19, tone: "ink" },
      // mây đen
      { kind: "path", d: "M78,50 C60,50 58,30 76,28 C76,12 100,8 108,20 C116,4 146,6 148,22 C166,18 176,44 160,50 Z", tone: "line", seed: 44, rough: 0.7 },
      { kind: "path", d: "M74,44 L84,28 L90,44 L98,20 L104,44 L113,16 L119,44 L128,16 L134,44 L143,22 L149,44 L157,30 L161,44", tone: "line", seed: 45, rough: 0.5, width: 1.5 },
      { kind: "pause", ms: 380 },
      // nét chốt: sức nặng đè xuống
      { kind: "text", text: "the weight of his failures", x: 178, y: 44, size: 19, tone: "ink" },
      { kind: "path", d: "M227,56 L245,56 L245,246 L258,246 L236,296 L214,246 L227,246 Z", tone: "ink", seed: 46, rough: 0.8, width: 2.6 },
      { kind: "text", text: "deep into depression", x: 236, y: 321, size: 21, anchor: "middle", tone: "ink" },
    ],
  },
  p03: {
    viewBox: "0 0 480 330",
    alt: "Phác thảo so sánh: bên trái người que cố leo bục winner (determination to be a winner) bị gạch chéo; bên phải Bukowski cầm gương soi thấy chữ loser (honest with himself); chuỗi knew it, accepted it, wrote honestly dẫn tới vòng khoanh bên phải kèm chữ honest và dấu tích.",
    steps: [
      // bên trái: leo bục
      { kind: "text", text: "determination", x: 16, y: 32, size: 19, tone: "ink" },
      { kind: "text", text: "to be a winner", x: 16, y: 54, size: 19, tone: "ink" },
      { kind: "path", d: "M30,226 L80,226 L80,196 L130,196 L130,150 L200,150 L200,252 L30,252 Z", tone: "line", seed: 51, rough: 0.7 },
      { kind: "text", text: "winner", x: 165, y: 188, size: 19, anchor: "middle", tone: "line" },
      { kind: "ellipse", cx: 88, cy: 104, w: 34, h: 36, tone: "line", seed: 52 },
      { kind: "path", d: "M89,122 C90,135 91,148 92,160", tone: "line", seed: 53 },
      { kind: "path", d: "M90,134 L112,140 L134,146 M90,134 L66,126", tone: "line", seed: 54 },
      { kind: "path", d: "M92,160 L112,178 L108,196 M92,160 L70,190 L60,226", tone: "line", seed: 55 },
      { kind: "pause", ms: 200 },
      { kind: "path", d: "M24,84 C70,130 150,200 204,256", tone: "ink", seed: 56, rough: 1, width: 2.6 },
      { kind: "path", d: "M204,84 C150,130 70,200 22,256", tone: "ink", seed: 57, rough: 1, width: 2.6 },
      // bên phải: Bukowski cầm gương
      ...bukowskiHead({ x: 326, y: 112 }),
      { kind: "path", d: "M326,140 C324,162 324,188 326,208", tone: "line", seed: 58 },
      { kind: "path", d: "M326,156 L372,176 L392,164", tone: "line", seed: 59 },
      { kind: "path", d: "M326,156 L294,188", tone: "line", seed: 60 },
      { kind: "path", d: "M326,208 L310,250 L299,252 M326,208 L344,250 L355,252", tone: "line", seed: 61 },
      { kind: "ellipse", cx: 408, cy: 114, w: 52, h: 68, tone: "line", seed: 62, rough: 0.6 },
      { kind: "ellipse", cx: 408, cy: 114, w: 43, h: 59, tone: "line", seed: 66, rough: 0.4 },
      { kind: "path", d: "M404,148 L391,167 M408,149 L396,169", tone: "line", seed: 63, rough: 0.4 },
      { kind: "path", d: "M394,99 L402,91", tone: "line", plain: true, width: 1.5 },
      { kind: "text", text: "loser", x: 408, y: 120, size: 18, anchor: "middle", tone: "line" },
      { kind: "text", text: "honest with himself", x: 352, y: 66, size: 19, anchor: "middle", tone: "ink" },
      { kind: "text", text: "Bukowski", x: 350, y: 272, size: 18, anchor: "middle", tone: "name" },
      // chuỗi
      { kind: "text", text: "knew it", x: 26, y: 316, size: 17, tone: "ink" },
      { kind: "arrow", points: [74, 311, 81, 311, 89, 311, 97, 311], tone: "ink" },
      { kind: "text", text: "accepted it", x: 102, y: 316, size: 17, tone: "ink" },
      { kind: "arrow", points: [174, 311, 181, 311, 189, 311, 197, 311], tone: "ink" },
      { kind: "text", text: "wrote honestly", x: 202, y: 316, size: 17, tone: "ink" },
      { kind: "arrow", points: [298, 311, 310, 311, 324, 311, 338, 311], tone: "ink" },
      { kind: "pause", ms: 380 },
      // nét chốt: khoanh bên phải + honest
      { kind: "ellipse", cx: 352, cy: 146, w: 232, h: 280, tone: "ink", seed: 64, rough: 1.2, multi: true },
      { kind: "path", d: "M348,311 L355,319 L368,301", tone: "ink", seed: 65, rough: 0.5, width: 2.4 },
      { kind: "text", text: "honest", x: 374, y: 321, size: 24, tone: "ink" },
      { kind: "arrow", points: [408, 300, 410, 293, 405, 288, 398, 280], tone: "ink" },
    ],
  },
};
