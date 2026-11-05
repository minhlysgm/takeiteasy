import { test, expect, type Page } from "@playwright/test";
import { P, dismissFirstTimeHint, finishTyping, selectText } from "./selection-helpers";

// Tiêu chí nghiệm thu 1–8, 12 — spec docs/superpowers/specs/2026-11-05-passage-jump-design.md.
// Desktop 1440×900.

const list = (page: Page) => page.getByTestId("jump-list");
const row = (page: Page, n: number) => page.locator(`[data-testid="jump-row"][data-index="${n}"]`);

async function open(page: Page, n: number) {
  await page.goto(P(n));
  await finishTyping(page, "click");
}

test.beforeEach(async ({ page }) => {
  await dismissFirstTimeHint(page);
});

test("1. Khi bấm bộ đếm thì hiện danh sách 3 đoạn có câu mở đầu, dòng 2 đang đọc", async ({ page }) => {
  await open(page, 2);
  const trigger = page.getByTestId("jump-trigger");
  await expect(trigger).toContainText("chương 1 · 2/3");
  await trigger.click();
  await expect(list(page)).toBeVisible();
  await expect(page.getByTestId("jump-row")).toHaveCount(3);
  await expect(row(page, 2)).toHaveAttribute("aria-current", "true");
  await expect(row(page, 2)).toContainText("Bukowski wanted to be a writer.");
  await expect(row(page, 1)).not.toHaveAttribute("aria-current", "true");
  await expect(list(page)).toContainText("Chương 1 · Don't Try");
});

test("2. Khi bấm dòng 1 thì danh sách đóng, sang đoạn 1 và trang ở đầu", async ({ page }) => {
  await open(page, 2);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByTestId("jump-trigger").click();
  await row(page, 1).click();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect(list(page)).toHaveCount(0);
  await expect(page.getByTestId("original-text")).toContainText("Charles Bukowski");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("3. Khi nhấn g thì danh sách mở; g hoặc Esc lần nữa thì đóng và focus về bộ đếm", async ({ page }) => {
  await open(page, 2);
  const trigger = page.getByTestId("jump-trigger");
  await page.keyboard.press("g");
  await expect(list(page)).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("g");
  await expect(list(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("g");
  await expect(list(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("4. Khi danh sách mở, nhấn ↑ rồi enter thì sang đoạn ngay trên", async ({ page }) => {
  await open(page, 2);
  await page.keyboard.press("g");
  await expect(row(page, 2)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect(list(page)).toHaveCount(0);
});

test("5. Khi ở đoạn 2 nhấn Home thì sang đoạn 1; nhấn End thì sang đoạn cuối", async ({ page }) => {
  await open(page, 2);
  await page.keyboard.press("Home");
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await finishTyping(page, "click");
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/\/ch01\/3$/);
});

test("6. Khi tấm giải thích đang mở thì g / Home / End không làm gì", async ({ page }) => {
  await open(page, 2);
  await page.keyboard.press("e");
  await page.locator("[data-chunk-id]").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (const key of ["g", "Home", "End"]) await page.keyboard.press(key);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect(list(page)).toHaveCount(0);
});

test("7. Khi đã mở đoạn 1 và 2 thì danh sách có ✓ ở dòng 1, 2, không có ở dòng 3; tải lại vẫn còn", async ({ page }) => {
  await open(page, 1);
  await page.getByRole("button", { name: /tiếp →/ }).click();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  const checks = async () => {
    await page.getByTestId("jump-trigger").click();
    await expect(list(page)).toBeVisible();
    await expect(row(page, 1)).toContainText("✓");
    await expect(row(page, 2)).toContainText("✓");
    await expect(row(page, 3)).not.toContainText("✓");
    await expect(list(page)).toContainText("2/3 đoạn đã đọc");
  };
  await checks();
  await page.reload();
  await finishTyping(page, "click");
  await checks();
});

test("8. Khi bấm ra ngoài danh sách thì danh sách đóng", async ({ page }) => {
  await open(page, 2);
  await page.getByTestId("jump-trigger").click();
  await expect(list(page)).toBeVisible();
  const box = (await page.getByTestId("original-col").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + 40);
  await expect(list(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/ch01\/2$/);
});

test("Danh sách đang mở mà bấm Back thì danh sách đóng, trang không bị khoá cuộn", async ({ page }) => {
  await open(page, 1);
  await page.getByRole("button", { name: /tiếp →/ }).click();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await page.getByTestId("jump-trigger").click();
  await expect(list(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect(list(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Đang bôi đen chữ mà nhấn g thì popup chọn chữ tắt", async ({ page }) => {
  await open(page, 1);
  expect(await selectText(page, "original-text", "chronic gambler", "selection-popup")).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("g");
  await expect(list(page)).toBeVisible();
  await expect(page.getByTestId("selection-popup")).toHaveCount(0);
});

test("12. reduced-motion: danh sách không có transition; đổi theme thì nền danh sách đổi theo token", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, 2);
  const theme0 = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.keyboard.press("g");
  await expect(list(page)).toBeVisible();
  // Tailwind `transition-none` chỉ đặt transition-property: none (duration vẫn còn) → nhận cả hai cách.
  const t = await list(page).evaluate((e) => {
    const s = getComputedStyle(e);
    return { prop: s.transitionProperty, dur: s.transitionDuration };
  });
  expect(t.prop === "none" || /^0s(, 0s)*$/.test(t.dur), JSON.stringify(t)).toBe(true);
  const bg0 = await list(page).evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg0).not.toBe("rgba(0, 0, 0, 0)");
  await page.keyboard.press("g");
  await expect(list(page)).toHaveCount(0);
  await page.keyboard.press("t");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(theme0);
  await page.keyboard.press("g");
  await expect(list(page)).toBeVisible();
  const bg1 = await list(page).evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg1).not.toBe("rgba(0, 0, 0, 0)");
  expect(bg1).not.toBe(bg0);
});
