import { test, expect, type Page } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// Header mobile ẩn khi cuộn xuống, hiện khi cuộn lên (mockup B, 2026-11-07).
const URL1 = "/read/the-subtle-art/ch01/1";
const headerBottom = async (page: Page) => (await page.locator("header").boundingBox())!.y + 44;
const scrollTo = (page: Page, y: number) => page.evaluate((to) => window.scrollTo(0, to), y);
const scrollBy = (page: Page, dy: number) => page.evaluate((d) => window.scrollBy(0, d), dy);
// ẩn = trượt hết lên trên mép màn; hiện = nằm sát mép trên
const hidden = (page: Page) => expect.poll(() => headerBottom(page)).toBeLessThanOrEqual(0);
const shown = (page: Page) => expect.poll(() => headerBottom(page)).toBe(44);

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
  await page.goto(URL1);
  await expect(page.getByTestId("translation-col")).toBeVisible();
});

test("Khi ở đầu thẻ thì header hiện", async ({ page }) => {
  await shown(page);
});

test("Khi cuộn xuống giữa thẻ thì header ẩn", async ({ page }) => {
  await scrollTo(page, 200);
  await scrollTo(page, 600);
  await hidden(page);
});

test("Khi đang ở giữa thẻ mà cuộn lên một chút thì header hiện, chạm loa mở được ô chọn giọng", async ({ page }) => {
  await scrollTo(page, 200);
  await scrollTo(page, 600);
  await hidden(page);
  await scrollBy(page, -80);
  await shown(page);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await page.getByTestId("voice-trigger-mobile").tap();
  await expect(page.getByTestId("voice-picker")).toBeVisible();
});

test("Khi header đang ẩn mà focus (Tab) vào nút trong header thì header hiện", async ({ page }) => {
  await scrollTo(page, 200);
  await scrollTo(page, 600);
  await hidden(page);
  await page.getByTestId("voice-trigger-mobile").focus();
  await shown(page);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300); // hiện tại chỗ, không nhảy về đầu thẻ
});

test("Khi chạm 'tiếp →' lúc header đang ẩn thì sang thẻ mới header hiện", async ({ page }) => {
  await scrollTo(page, 200);
  await scrollTo(page, 600);
  await hidden(page);
  await page.getByRole("button", { name: /tiếp →/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await shown(page);
});
