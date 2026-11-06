import { test, expect, type Page } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// B2 (soi UI 2026-11-06): desktop dưới 1440px dùng một cột giữa như tablet (hình → mô tả → bản dịch),
// hình đủ to; từ 1440px trở lên mới chia hai cột mô tả | bản dịch.

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
});

const box = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox())!;

for (const width of [1024, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("một cột giữa: hình rộng ≥ 600px, bản dịch nằm dưới mô tả", async ({ page }) => {
      await page.goto("/read/the-subtle-art/ch01/1");
      const svg = (await page.getByTestId("sketch").locator("svg").boundingBox())!;
      expect(svg.width).toBeGreaterThanOrEqual(600);
      const cap = await box(page, "caption-text");
      const tr = await box(page, "translation-col");
      expect(tr.y).toBeGreaterThanOrEqual(cap.y + cap.height);
      // cùng một cột: mép trái trùng nhau, cột nằm giữa màn
      expect(Math.abs(tr.x - cap.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(cap.x - (width - (cap.x + cap.width)))).toBeLessThanOrEqual(2);
      expect(cap.width).toBeLessThanOrEqual(640);
    });
  });
}

test.describe("1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("hai cột: bản dịch nằm cạnh mô tả", async ({ page }) => {
    await page.goto("/read/the-subtle-art/ch01/1");
    const cap = await box(page, "caption-col");
    const tr = await box(page, "translation-col");
    expect(tr.x).toBeGreaterThanOrEqual(cap.x + cap.width);
    expect(Math.abs(tr.y - cap.y)).toBeLessThanOrEqual(2);
  });
});
