import { test, expect } from "@playwright/test";
import { markShell, shellState } from "./persist-helpers";

// Màn đọc sống xuyên các đoạn trong một chương: header/footer không dựng lại, vạch tiến độ trượt.
// Cùng kịch bản chạy ở desktop (vạch `width`) và mobile (vạch `scaleX`, file .mobile.spec.ts).

const BAR = '[data-testid="desktop-progress"]';

test("Khi bấm đoạn tiếp thì header/footer giữ nguyên (không dựng lại), vạch tiến độ trượt, nội dung sang đoạn 2", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await markShell(page, BAR);
  const before = await page.getByTestId("caption-text").textContent();
  await page.getByRole("button", { name: /tiếp →/ }).click();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect(page.getByTestId("caption-text")).not.toHaveText(before!);
  await expect(page.locator("header")).toContainText("đoạn 2/");
  await expect.poll(() => shellState(page)).toMatchObject({ header: true, footer: true, transitions: ["width"] });

  // Nút back của trình duyệt cũng vậy
  await page.goBack();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect(page.getByTestId("caption-text")).toHaveText(before!);
  expect((await shellState(page)).header).toBe(true);
});

test("Khi mở URL đoạn sai thì vẫn chuyển hướng như cũ", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/99");
  await expect(page).toHaveURL(/\/ch01\/3$/);
  await page.goto("/read/the-subtle-art/ch01/abc");
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await page.goto("/read/the-subtle-art/nope/1");
  await expect(page).toHaveURL(/\/the-subtle-art\/ch01\/1$/);
});
