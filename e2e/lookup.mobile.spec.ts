import { test, expect, type Page } from "@playwright/test";
import { LOUT, mockLookup } from "./lookup-helpers";
import { P, dismissFirstTimeHint, finishTyping, installSpies, selectText } from "./selection-helpers";

// Tiêu chí nghiệm thu 7 — spec docs/superpowers/specs/2026-11-05-in-app-lookup-design.md.
// Pixel 7 (390×844, cảm ứng). Vùng chọn tạo bằng script; /api/lookup luôn bị giả.

const dock = (page: Page) => page.getByTestId("selection-dock");

async function openCard(page: Page) {
  await mockLookup(page, { status: "ok", result: LOUT });
  await installSpies(page);
  await dismissFirstTimeHint(page);
  await page.goto(P(1));
  await finishTyping(page, "tap");
  await selectText(page, "original-text", "lout");
  await expect(dock(page)).toBeVisible();
  await dock(page).getByRole("button", { name: "tra nghĩa" }).tap();
  await expect(dock(page).getByTestId("lookup-card")).toContainText("kẻ thô lỗ");
}

test("Khi chạm \"tra nghĩa\" thì thẻ nằm trong thanh đáy, ngay trên footer, có nút đóng thẻ", async ({ page }) => {
  await openCard(page);
  await expect(dock(page).getByRole("button", { name: "đóng thẻ" })).toBeVisible();
  const c = (await dock(page).getByTestId("lookup-card").boundingBox())!;
  const f = (await page.locator("footer").boundingBox())!;
  expect(c.y + c.height, "đáy thẻ ≤ đỉnh footer").toBeLessThanOrEqual(f.y + 1);
});

test("Khi chạm đóng thẻ thì thẻ ẩn", async ({ page }) => {
  await openCard(page);
  await dock(page).getByRole("button", { name: "đóng thẻ" }).tap();
  await expect(page.getByTestId("lookup-card")).toHaveCount(0);
});

test.describe("320×640", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("Khi ở 320px thì thanh không tràn ngang, nút nghe / tra nghĩa / đóng thẻ cao ≥ 44px", async ({ page }) => {
    await openCard(page);
    const d = dock(page);
    const { sw, cw } = await d.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sw, "scrollWidth thanh").toBeLessThanOrEqual(cw);
    for (const name of ["nghe", "tra nghĩa", "đóng thẻ"]) {
      const b = d.getByRole("button", { name, exact: true });
      expect((await b.boundingBox())!.height, name).toBeGreaterThanOrEqual(44);
    }
    expect((await d.getByRole("button", { name: "nghe: lout" }).boundingBox())!.height, "nghe: lout").toBeGreaterThanOrEqual(44);
  });
});
