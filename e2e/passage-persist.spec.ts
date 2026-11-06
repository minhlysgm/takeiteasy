import { test, expect } from "@playwright/test";
import { markShell, shellState } from "./persist-helpers";

// Màn đọc sống xuyên các đoạn trong một chương: header/footer không dựng lại, vạch tiến độ trượt.
// Cùng kịch bản chạy ở desktop và mobile (file .mobile.spec.ts); cả hai vạch đều co giãn bằng `scaleX`.

const BAR = '[data-testid="desktop-progress"]';

test("Khi bấm thẻ tiếp thì header/footer giữ nguyên (không dựng lại), vạch tiến độ trượt, nội dung sang thẻ 2", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await markShell(page, BAR);
  const before = await page.getByTestId("caption-text").textContent();
  await page.getByRole("button", { name: /tiếp →/ }).click();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect(page.getByTestId("caption-text")).not.toHaveText(before!);
  await expect(page.locator("header")).toContainText("thẻ 2/");
  await expect.poll(() => shellState(page)).toMatchObject({ header: true, footer: true, transitions: ["transform"] });

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

test("Khi ở desktop thì vạch tiến độ co giãn bằng transform 300ms ease-out, không animate width", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/2");
  const cs = await page.getByTestId("desktop-progress").evaluate((e) => {
    const s = getComputedStyle(e);
    return { prop: s.transitionProperty, dur: s.transitionDuration, ease: s.transitionTimingFunction, tf: s.transform, origin: s.transformOrigin };
  });
  expect(cs.prop).toBe("transform");
  expect(cs.dur).toBe("0.3s");
  expect(cs.ease).toBe("cubic-bezier(0, 0, 0.2, 1)");
  expect(cs.tf).toMatch(/^matrix\(0\.66/); // thẻ 2/3
  expect(cs.origin.startsWith("0px")).toBe(true);
});
