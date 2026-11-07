import { test, expect, type Page } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// Nút "N" của Next (chỉ khi dev) đã tắt (next.config: devIndicators: false): góc nào của màn đọc mobile cũng có nút
// của app (loa chọn giọng | theme ở header, "giải thích" | "tiếp →" ở footer), để đâu cũng đè. Lỗi build/runtime
// vẫn hiện huy hiệu / overlay như thường.
async function expectNoDevButton(page: Page) {
  // Khung dev tools của Next đã dựng xong (có cả khi tắt nút N) → lúc này mới kiểm nút N có hay không
  await expect(page.locator("nextjs-portal [data-next-badge-root]")).toBeAttached();
  await expect(page.locator("nextjs-portal [data-nextjs-dev-tools-button]")).toHaveCount(0);
}

for (const [w, h] of [[320, 700], [390, 844], [1440, 900]]) {
  test(`${w}px: không có nút N của Next đè lên màn đọc và kệ sách`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await markCardsSeen(page);
    await page.goto("/read/the-subtle-art/ch01/1");
    await page.keyboard.press("e");
    await expect(page.locator("header")).toContainText("explain"); // đã hydrate
    await expectNoDevButton(page);
    await page.goto("/");
    await expectNoDevButton(page);
  });
}
