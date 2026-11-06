import { test, expect, type Page } from "@playwright/test";

// C5: kệ sách trên mobile — "> chọn chương để bắt đầu" và "theme: … — bấm để đổi" xếp dọc, mỗi dòng không gãy chữ.

/** Số dòng chữ của phần tử: chiều cao hộp chia cho line-height. */
const lineCount = (page: Page, text: string) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("span,button")].find((e) => e.textContent?.trim().startsWith(t))!;
    return Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  }, text);

for (const width of [320, 390]) {
  test(`Kệ sách ${width}px: hai dòng cuối xếp dọc, không mồ côi chữ`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const theme = page.getByRole("button", { name: /theme: .* — bấm để đổi/ });
    await expect(theme).toBeVisible();
    expect(await lineCount(page, "> chọn chương")).toBe(1);
    expect(await lineCount(page, "theme:")).toBe(1);
    const hint = (await page.getByText("> chọn chương để bắt đầu").boundingBox())!;
    const btn = (await theme.boundingBox())!;
    expect(btn.y).toBeGreaterThanOrEqual(hint.y + hint.height - 1); // nằm dưới, không cạnh nhau
    expect(Math.abs(btn.x - hint.x)).toBeLessThan(2); // cùng lề trái
  });
}
