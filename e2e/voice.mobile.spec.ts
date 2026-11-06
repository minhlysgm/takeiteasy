import { test, expect, type Page } from "@playwright/test";
import { stubAudio } from "./audio-helpers";
import { markCardsSeen } from "./card-helpers";

// Mobile: nút loa ở ô trái header mở tấm chọn giọng từ dưới lên.

const URL1 = "/read/the-subtle-art/ch01/1";

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
  await stubAudio(page);
});

const trigger = (page: Page) => page.getByTestId("voice-trigger-mobile");
const picker = (page: Page) => page.getByTestId("voice-picker");

test("TC8 mobile: nút loa (≥ 44×44) mở tấm 5 giọng; ✕ đóng → focus về nút; chọn Jessica → nhãn đổi", async ({ page }) => {
  await page.goto(URL1);
  await expect(trigger(page)).toHaveAttribute("aria-label", "giọng đọc: Will");
  const box = (await trigger(page).boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByTestId("voice-trigger")).toBeHidden(); // nút desktop không hiện trên mobile

  await trigger(page).tap();
  await expect(picker(page)).toBeVisible();
  await expect(picker(page).getByRole("radio")).toHaveCount(5);
  await expect(picker(page).getByRole("radio", { name: /^Will/ })).toHaveAttribute("aria-checked", "true");
  await picker(page).getByRole("button", { name: "đóng" }).tap();
  await expect(picker(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();

  await trigger(page).tap();
  await picker(page).getByRole("radio", { name: /^Jessica/ }).tap();
  await expect(picker(page).getByRole("radio", { name: /^Jessica/ })).toHaveAttribute("aria-checked", "true");
  await expect(trigger(page)).toHaveAttribute("aria-label", "giọng đọc: Jessica");
});

test("320px: đang đọc to ('■ dừng') footer vẫn vừa màn, không cuộn ngang", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(URL1);
  const read = page.getByRole("button", { name: /đọc to|■ dừng/ });
  await read.tap();
  await expect(read).toContainText("■ dừng");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const boxes = await page.locator("footer button:visible").evaluateAll((els) =>
    els.map((e) => ({ t: e.textContent?.trim(), l: e.getBoundingClientRect().left, r: e.getBoundingClientRect().right })),
  );
  for (const b of boxes) {
    expect(b.l, `"${b.t}" mép trái`).toBeGreaterThanOrEqual(0);
    expect(b.r, `"${b.t}" mép phải`).toBeLessThanOrEqual(320);
  }
});
