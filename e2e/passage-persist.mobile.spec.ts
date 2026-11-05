import { test, expect } from "@playwright/test";
import { markShell, shellState } from "./persist-helpers";

test("Khi chạm tiếp → trên mobile thì header/footer giữ nguyên, vạch tiến độ trượt (scaleX)", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await markShell(page, '[data-testid="mobile-progress"]');
  await page.getByRole("button", { name: /tiếp →/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect.poll(() => shellState(page)).toMatchObject({ header: true, footer: true, transitions: ["transform"] });
});

test("Khi đang cuộn xuống giữa đoạn mà chạm tiếp → thì đoạn mới mở từ đầu trang", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await page.evaluate(() => window.scrollTo(0, 150));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await page.getByRole("button", { name: /tiếp →/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("Khi bấm back của trình duyệt thì đoạn trước mở lại đúng chỗ đang đọc (không kéo lên đầu)", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await page.evaluate(() => window.scrollTo(0, 150));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const y = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: /tiếp →/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
});
