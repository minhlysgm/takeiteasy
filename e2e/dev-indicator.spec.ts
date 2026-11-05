import { test, expect, type Page } from "@playwright/test";

// Nút "N" của Next chỉ có khi chạy dev (e2e chạy trên dev server) — không được đè lên nút nào của app.
async function coveredButtons(page: Page) {
  const n = page.locator("nextjs-portal [data-nextjs-dev-tools-button]");
  await expect(n).toBeVisible();
  const nb = (await n.boundingBox())!;
  return page.evaluate((nb) => {
    const inN = (el: Element) => el.closest("nextjs-portal") !== null;
    return [...document.querySelectorAll<HTMLElement>("button, a")]
      .filter((el) => el.offsetParent !== null && !inN(el))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < nb.x + nb.width && r.right > nb.x && r.top < nb.y + nb.height && r.bottom > nb.y;
      })
      .map((el) => el.textContent?.trim() || el.getAttribute("aria-label"));
  }, nb);
}

for (const [w, h] of [[320, 700], [390, 844], [1440, 900]]) {
  test(`${w}px: nút N không che nút nào ở màn đọc (bật giải thích) và kệ sách`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/read/the-subtle-art/ch01/1");
    await page.keyboard.press("e");
    expect(await coveredButtons(page), "màn đọc").toEqual([]);
    await page.goto("/");
    expect(await coveredButtons(page), "kệ sách").toEqual([]);
  });
}
