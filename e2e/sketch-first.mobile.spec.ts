import { test, expect } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// Tiêu chí 10 (spec 2026-11-06): mobile xếp một cột hình → mô tả → bản dịch → ý chính → ghi công; mở thẻ là hình vẽ.

test.use({ viewport: { width: 390, height: 844 } });

test("10: thứ tự hình → mô tả → bản dịch → ý chính → ghi công; hình vẽ khi mở", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  const sketch = page.getByTestId("sketch");
  await expect(sketch).toHaveAttribute("data-state", /drawing|done/, { timeout: 5000 });
  await expect(page.getByTestId("caption-waiting")).toBeVisible();
  await page.getByRole("button", { name: "xem ngay ⏭" }).click();
  await expect(sketch).toHaveAttribute("data-state", "done");
  // Chạm cột dịch = bỏ qua hiệu ứng gõ
  await page.getByTestId("translation-col").tap();
  await expect(page.getByTestId("credit")).toBeVisible();

  const y = async (loc: ReturnType<typeof page.getByTestId>) => (await loc.boundingBox())!.y;
  const ys = [
    await y(sketch),
    await y(page.getByTestId("caption-text")),
    await y(page.getByTestId("translation-col")),
    await y(page.getByText("// ý chính")),
    await y(page.getByTestId("credit")),
  ];
  for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
});

test("11: 320px không tràn ngang, header vừa 'chương 1 · thẻ 2/3'", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await markCardsSeen(page);
  await page.goto("/read/the-subtle-art/ch01/2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const trigger = page.getByTestId("jump-trigger-mobile");
  await expect(trigger).toContainText("chương 1 · thẻ 2/3");
  await expect(trigger).toBeVisible();
  // chữ không bị cắt "…": phần chữ vừa khít trong ô chứa nó
  const clipped = await trigger.locator("span.truncate").evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(clipped).toBe(false);
});
