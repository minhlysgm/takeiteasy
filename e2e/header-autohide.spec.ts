import { test, expect } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

test("Desktop: cuộn xuống thì header vẫn dính, không ẩn", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 500 });
  await markCardsSeen(page);
  await page.goto("/read/the-subtle-art/ch01/1");
  await page.evaluate(() => window.scrollTo(0, 150));
  await page.evaluate(() => window.scrollTo(0, 400));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100); // trang đủ dài để cuộn
  await page.waitForTimeout(300); // qua thời gian trượt (nếu có)
  expect((await page.locator("header").boundingBox())!.y).toBe(0);
});
