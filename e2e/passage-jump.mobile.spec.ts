import { test, expect, type Page } from "@playwright/test";
import { P, dismissFirstTimeHint, finishTyping } from "./selection-helpers";

// Tiêu chí nghiệm thu 9–11 — spec docs/superpowers/specs/2026-11-05-passage-jump-design.md.
// Mobile 390×844 (cảm ứng).

const list = (page: Page) => page.getByTestId("jump-list");
const trigger = (page: Page) => page.getByTestId("jump-trigger-mobile");
const bodyOverflow = (page: Page) => page.evaluate(() => document.body.style.overflow);
// Tailwind `transition-none` chỉ đặt transition-property: none (duration vẫn còn) → coi cả hai cách là "không trượt".
const transition = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((e) => {
    const s = getComputedStyle(e);
    return s.transitionProperty === "none" || /^0s(, 0s)*$/.test(s.transitionDuration) ? "none" : s.transitionProperty;
  });

async function open(page: Page, n: number) {
  await page.goto(P(n));
  await finishTyping(page, "tap");
}

test.beforeEach(async ({ page }) => {
  await dismissFirstTimeHint(page);
});

test("9. Khi chạm tiêu đề header thì tấm danh sách trượt lên; chạm một dòng thì sang đoạn đó và tấm đóng", async ({ page }) => {
  await open(page, 1);
  await expect(trigger(page)).toContainText("chương 1 · đoạn 1/3");
  await trigger(page).tap();
  await expect(list(page)).toBeVisible();
  await expect.poll(() => list(page).evaluate((e) => e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(845);
  await page.locator('[data-testid="jump-row"][data-index="3"]').tap();
  await expect(page).toHaveURL(/\/ch01\/3$/);
  await expect(list(page)).toHaveCount(0);
  await expect(trigger(page)).toContainText("đoạn 3/3");
});

test("10. Khi chạm ✕ hoặc vùng mờ thì tấm đóng; khi tấm đang mở thì trang sau không cuộn", async ({ page }) => {
  await open(page, 2);
  await trigger(page).tap();
  await expect(list(page)).toBeVisible();
  expect(await bodyOverflow(page)).toBe("hidden");
  await list(page).getByRole("button", { name: "đóng" }).tap();
  await expect(list(page)).toHaveCount(0);
  expect(await bodyOverflow(page)).toBe("");

  await trigger(page).tap();
  await expect(list(page)).toBeVisible();
  expect(await bodyOverflow(page)).toBe("hidden");
  await page.touchscreen.tap(195, 100); // vùng mờ phía trên tấm
  await expect(list(page)).toHaveCount(0);
  expect(await bodyOverflow(page)).toBe("");
  await expect(page).toHaveURL(/\/ch01\/2$/);
});

test("11. Ở 320px tiêu đề vừa một dòng, vùng chạm ≥ 44px; các dòng trong tấm cao ≥ 44px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, 2);
  const t = trigger(page);
  const m = await t.evaluate((e) => {
    const label = e.firstElementChild as HTMLElement;
    return {
      h: e.getBoundingClientRect().height,
      sw: e.scrollWidth,
      cw: e.clientWidth,
      labelH: label.getBoundingClientRect().height,
      lineH: parseFloat(getComputedStyle(label).lineHeight),
      right: e.getBoundingClientRect().right,
    };
  });
  expect(m.h).toBeGreaterThanOrEqual(44);
  expect(m.sw).toBeLessThanOrEqual(m.cw);
  expect(m.labelH).toBeLessThan(2 * m.lineH);
  expect(m.right).toBeLessThanOrEqual(320);
  await expect(t.locator("> span").last()).toBeVisible(); // ▾ vẫn hiện (chỉ nhường chỗ khi bật giải thích)
  await t.tap();
  await expect(list(page)).toBeVisible();
  const heights = await page.getByTestId("jump-row").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(heights).toHaveLength(3);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});

test("Danh sách đang mở mà bấm Back thì tấm đóng và trang hết khoá cuộn", async ({ page }) => {
  await open(page, 1);
  await page.getByRole("button", { name: /tiếp →/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await trigger(page).tap();
  await expect(list(page)).toBeVisible();
  expect(await bodyOverflow(page)).toBe("hidden");
  await page.goBack();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect(list(page)).toHaveCount(0);
  expect(await bodyOverflow(page)).toBe("");
});

test("reduced-motion: tấm hiện/ẩn không trượt (không có transition)", async ({ page }) => {
  await open(page, 1);
  await trigger(page).tap();
  await expect(list(page)).toBeVisible();
  expect(await transition(page, "jump-list")).toBe("transform");
  await list(page).getByRole("button", { name: "đóng" }).tap();
  await expect(list(page)).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger(page).tap();
  await expect(list(page)).toBeVisible();
  expect(await transition(page, "jump-list")).toBe("none");
  expect(await transition(page, "jump-backdrop")).toBe("none");
});
