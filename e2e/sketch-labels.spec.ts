import { test, expect } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// Tiêu chí 13b — chữ trong hình không chạm nét vẽ: mỗi chữ cách mọi nét ≥ PAD đơn vị (viewBox 520×340),
// nằm trọn trong khung hình và không chồng lên chữ khác (B5: chữ cỡ 21).
// Cùng thuật toán với `labelClashes` trong scripts/content/cards.ts (phần chữ–nét), đo trên hình thật của reader.

const PAD = 6;
test.use({ viewport: { width: 1440, height: 900 } });

for (const n of [1, 2, 3]) {
  test(`13b: thẻ ${n} — chữ trong hình cách mọi nét ≥ ${PAD} đơn vị, trong khung, không chồng nhau`, async ({ page }) => {
    await markCardsSeen(page); // hình hiện đủ ngay
    await page.goto(`/read/the-subtle-art/ch01/${n}`);
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await page.evaluate(() => document.fonts.ready);

    const result = await page.evaluate((pad) => {
      const art = document.querySelector('[data-testid="sketch-art"]');
      if (!art) throw new Error("không thấy sketch-art");
      // Chỉ lấy nét thật: <path>/<ellipse> trực tiếp trong sketch-art (clipPath nằm ở <defs>, bút ở ngoài)
      const shapes = [...art.querySelectorAll("path, ellipse")] as SVGGeometryElement[];
      const strokes = shapes.map((p) => {
        const L = p.getTotalLength();
        const pts: { x: number; y: number }[] = [];
        for (let t = 0; t <= L; t += 1) {
          const q = p.getPointAtLength(t);
          pts.push({ x: q.x, y: q.y });
        }
        return { name: (p.getAttribute("d") ?? "ellipse").slice(0, 28), pts };
      });
      const texts = [...art.querySelectorAll("text")];
      const errors: string[] = [];
      const vb = (art.closest("svg") as SVGSVGElement).viewBox.baseVal;
      for (const [i, t] of texts.entries()) {
        const b = t.getBBox(); // đơn vị người dùng của SVG (viewBox), không phải pixel CSS
        // Nằm trọn trong khung hình (viewBox), không bị cắt mép
        if (b.x < vb.x || b.y < vb.y || b.x + b.width > vb.x + vb.width || b.y + b.height > vb.y + vb.height)
          errors.push(`chữ "${t.textContent}" ra ngoài khung hình (${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}×${Math.round(b.height)})`);
        // Không chồng lên chữ khác (cùng quy tắc với công cụ biên tập: giao theo chiều cao > 35% dòng mới tính là đè)
        for (const u of texts.slice(i + 1)) {
          const c = u.getBBox();
          const overlapY = Math.min(b.y + b.height, c.y + c.height) - Math.max(b.y, c.y);
          if (b.x < c.x + c.width + 2 && c.x < b.x + b.width + 2 && overlapY > 0.35 * Math.min(b.height, c.height))
            errors.push(`chữ "${t.textContent}" chồng lên chữ "${u.textContent}"`);
        }
        for (const s of strokes) {
          if (s.pts.some((q) => q.x > b.x - pad && q.x < b.x + b.width + pad && q.y > b.y - pad && q.y < b.y + b.height + pad))
            errors.push(`chữ "${t.textContent}" cách nét "${s.name}…" < ${pad}`);
        }
      }
      return { errors, nStrokes: strokes.length, nTexts: texts.length };
    }, PAD);

    // Đo thật có việc để đo: có nét và có chữ
    expect(result.nStrokes).toBeGreaterThan(0);
    expect(result.nTexts).toBeGreaterThan(0);
    expect(result.errors, result.errors.join("\n")).toEqual([]);
  });
}
