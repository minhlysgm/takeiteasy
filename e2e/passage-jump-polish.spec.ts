import { test, expect, type Page } from "@playwright/test";
import { P, dismissFirstTimeHint, finishTyping, selectText } from "./selection-helpers";
import { markCardsSeen } from "./card-helpers";

// Không kiểm luồng vẽ trước: coi như đã xem hình, mở thẻ là mô tả + bản dịch hiện đủ.
test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
});

// Sửa sau trạm ⑥ của "nhảy nhanh tới đoạn" (soi UI + code review). Desktop 1440×900.

const list = (page: Page) => page.getByTestId("jump-list");
const row = (page: Page, n: number) => page.locator(`[data-testid="jump-row"][data-index="${n}"]`);
const activeTestId = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? document.activeElement?.tagName);

async function open(page: Page, n: number) {
  await page.goto(P(n));
  await finishTyping(page, "click");
}

test.describe("đã tắt mẹo lần đầu", () => {
  test.beforeEach(async ({ page }) => {
    await dismissFirstTimeHint(page);
  });

  test("Viền focus của dòng nằm trong dòng (khung cuộn không cắt mất)", async ({ page }) => {
    await open(page, 2);
    await page.keyboard.press("g");
    await expect(row(page, 2)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(row(page, 1)).toBeFocused();
    const offset = await row(page, 1).evaluate((e) => parseFloat(getComputedStyle(e).outlineOffset));
    expect(offset).toBeLessThan(0);
  });

  test("Shift+Tab ra khỏi ô nổi: ô đóng, focus ở đúng chỗ vừa tới (không bị kéo về bộ đếm)", async ({ page }) => {
    await open(page, 2);
    await page.keyboard.press("g");
    await page.keyboard.press("ArrowUp");
    await expect(row(page, 1)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(list(page)).toHaveCount(0);
    const at = await activeTestId(page);
    expect(at).not.toBe("BODY");
    expect(at).not.toBe("jump-trigger");
  });

  test("Đang bôi đen mà nhấn Shift+End / Shift+Home thì không nhảy đoạn", async ({ page }) => {
    await open(page, 2);
    await selectText(page, "caption-col", "worries");
    for (const key of ["Shift+End", "Shift+Home"]) {
      await page.keyboard.press(key);
      await expect(page).toHaveURL(/\/ch01\/2$/);
    }
  });

  test("Tấm giải thích mở bằng phím, cuộn đi chỗ khác, Esc → trang cuộn về lại ghi chú vừa mở", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 420 });
    await open(page, 2);
    await page.keyboard.press("e");
    const note = page.getByTestId("reader").locator("button.font-hand").first();
    await note.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    // Ghi chú nằm cạnh mô tả, dưới hình → cuộn lên đầu trang là ghi chú ra khỏi màn hình
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(note).not.toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(note).toBeFocused();
    await expect(note).toBeInViewport();
  });
});

test("Ô nổi đang mở thì dòng mẹo lần đầu tạm ẩn; đóng ô thì mẹo hiện lại", async ({ page }) => {
  await open(page, 2);
  const hint = page.getByRole("button", { name: "đã hiểu" });
  await expect(hint).toBeVisible();
  await page.keyboard.press("g");
  await expect(list(page)).toBeVisible();
  await expect(hint).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(list(page)).toHaveCount(0);
  await expect(hint).toBeVisible();
});
