import { test, expect, type Page } from "@playwright/test";
import { P, charBoxes, finishTyping, installSpies, selectText } from "./selection-helpers";

// Tiêu chí nghiệm thu 10–12 + RF5 — spec docs/superpowers/specs/2026-11-05-touch-selection-design.md.
// Desktop 1440×900, chuột.

const popup = (page: Page) => page.getByTestId("selection-popup");

/** Nhấn chuột ở đầu ký tự đầu của `needle`, kéo tới cuối ký tự cuối (chưa thả). */
async function dragOver(page: Page, needle: string) {
  const { first, last } = await charBoxes(page, needle);
  await page.mouse.move(first.left + 1, (first.top + first.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move(last.right - 1, (last.top + last.bottom) / 2, { steps: 8 });
}

test.beforeEach(async ({ page }) => {
  await installSpies(page);
});

test("Khi kéo chuột bôi đen thì lúc đang kéo chưa hiện popup; thả ra thì popup hiện phía trên vùng chọn", async ({ page }) => {
  await page.goto(P(1));
  await finishTyping(page, "click");
  await dragOver(page, "chronic gambler");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("chronic gambler");
  await expect(popup(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /tra nghĩa/ })).toBeVisible();
  const sel = await page.evaluate(() => window.getSelection()!.getRangeAt(0).getBoundingClientRect().top);
  const b = (await popup(page).boundingBox())!;
  expect(b.y + b.height, "đáy popup ở trên vùng chọn").toBeLessThanOrEqual(sel);
});

test.describe("1024×800", () => {
  test.use({ viewport: { width: 1024, height: 800 } });

  test("Khi bôi đen chữ sát mép trái cột thì popup nằm trọn trong màn hình", async ({ page }) => {
    await page.goto(P(1));
    await finishTyping(page, "click");
    await dragOver(page, "Charles");
    await page.mouse.up();
    await expect(popup(page)).toBeVisible();
    const b = (await popup(page).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(1024);
  });
});

test('Khi bôi đen 6 từ trở lên thì popup chỉ có "nghe"', async ({ page }) => {
  await page.goto(P(1));
  await finishTyping(page, "click");
  await dragOver(page, "Charles Bukowski was an alcoholic, a");
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /nghe/ })).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /tra nghĩa/ })).toHaveCount(0);
});

test("Khi đổi cỡ từ 1280px xuống 390px lúc đang chọn thì popup nhường chỗ cho thanh, không lúc nào có cả hai", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(P(1));
  await finishTyping(page, "click");
  await page.evaluate(() => {
    const w = window as unknown as { __both: boolean };
    w.__both = false;
    const check = () => {
      if (document.querySelector('[data-testid="selection-popup"]') && document.querySelector('[data-testid="selection-dock"]'))
        w.__both = true;
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
  });
  await selectText(page, "original-text", "chronic gambler");
  await expect(popup(page)).toBeVisible();
  await expect(page.getByTestId("selection-dock")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("selection-dock")).toBeVisible();
  await expect(popup(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __both: boolean }).__both)).toBe(false);
});
