import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Đọc token màu trực tiếp từ lib/theme.css để test bám đúng file thật.
const css = readFileSync("lib/theme.css", "utf8");
function tokens(selector: RegExp): Record<string, string> {
  const block = css.match(selector)![1];
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}
const themes = {
  dark: tokens(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/),
  light: tokens(/:root\[data-theme="light"\]\s*\{([^}]*)\}/),
};

/** Độ tương phản WCAG 2.x giữa hai màu hex. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("độ tương phản chữ phụ (--muted)", () => {
  for (const [name, t] of Object.entries(themes)) {
    for (const bg of ["bg", "surface"]) {
      it(`${name}: muted trên ${bg} ≥ 4.5:1`, () => {
        expect(contrast(t.muted, t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${name}: chữ thường vẫn đậm hơn chữ phụ rõ rệt (giữ thứ bậc)`, () => {
      expect(contrast(t.text, t.bg) / contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(1.5);
    });
  }
});

describe("viền focus bàn phím (--focus)", () => {
  for (const [name, t] of Object.entries(themes)) {
    for (const bg of ["bg", "surface"]) {
      it(`${name}: --focus trên --${bg} tương phản ≥ 3:1 (WCAG non-text)`, () => {
        expect(contrast(t.focus, t[bg])).toBeGreaterThanOrEqual(3);
      });
    }
    it(`${name}: --focus khác màu --ink để nút đang bật vẫn thấy viền focus`, () => {
      expect(t.focus.toLowerCase()).not.toBe(t.ink.toLowerCase());
    });
  }
});

describe("dòng đang đọc trong danh sách đoạn (nền --accent-soft)", () => {
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: --accent-strong trên --accent-soft và --surface ≥ 4.5:1`, () => {
      expect(contrast(t["accent-strong"], t["accent-soft"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["accent-strong"], t.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: --text trên --accent-soft ≥ 4.5:1 (số thứ tự dòng)`, () => {
      expect(contrast(t.text, t["accent-soft"])).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("màu nhấn (--accent) và màu mực (--ink) đọc được, tách bạch", () => {
  for (const [name, t] of Object.entries(themes)) {
    for (const bg of ["bg", "surface"]) {
      it(`${name}: --accent trên --${bg} ≥ 4.5:1 (nhãn "// ý chính", "đang gõ…")`, () => {
        expect(contrast(t.accent, t[bg])).toBeGreaterThanOrEqual(4.5);
      });
      it(`${name}: --ink trên --${bg} ≥ 4.5:1 (thanh mẹo, "· explain", ghi chú tay)`, () => {
        expect(contrast(t.ink, t[bg])).toBeGreaterThanOrEqual(4.5);
      });
      it(`${name}: --ink-strong trên --${bg} ≥ 4.5:1`, () => {
        expect(contrast(t["ink-strong"], t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${name}: --accent trên --accent-soft ≥ 4.5:1 (dấu ✓ ở dòng đang đọc)`, () => {
      expect(contrast(t.accent, t["accent-soft"])).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: --accent khác --ink, --ink-strong khác --ink (tone nhấn trong hình khác tone mực)`, () => {
      expect(t.accent.toLowerCase()).not.toBe(t.ink.toLowerCase());
      expect(t["ink-strong"].toLowerCase()).not.toBe(t.ink.toLowerCase());
      expect(t["accent-strong"].toLowerCase()).not.toBe(t["ink-strong"].toLowerCase());
    });
  }
});
