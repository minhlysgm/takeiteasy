import { test, expect, type Page } from "@playwright/test";

const P1 = "/read/the-subtle-art/ch01/1";

/** Chạm cột dịch = bỏ qua hiệu ứng gõ chữ, rồi chờ "đang gõ…" ẩn. */
async function finishTyping(page: Page) {
  await page.getByTestId("translation-col").tap();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

test("trang không cuộn ngang ở 390px", async ({ page }) => {
  await page.goto(P1);
  await expect(page.getByTestId("original-col")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("nguyên văn và bản dịch nằm trọn bề ngang, bản dịch ở dưới", async ({ page }) => {
  await page.goto(P1);
  await expect(page.getByTestId("original-col")).toBeVisible();
  const o = await page.getByTestId("original-col").boundingBox();
  const t = await page.getByTestId("translation-col").boundingBox();
  expect(o).not.toBeNull();
  expect(t).not.toBeNull();
  for (const b of [o!, t!]) {
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
  expect(t!.y).toBeGreaterThanOrEqual(o!.y + o!.height);
});

test("chạm bản dịch khi đang gõ thì hiện đủ ngay", async ({ page }) => {
  await page.goto(P1);
  await expect(page.getByText("đang gõ…")).toBeVisible();
  await finishTyping(page);
  await expect(page.getByTestId("translation-col")).toContainText("điểm khởi đầu hoàn hảo");
});

test("header gọn: chỉ chương và số đoạn", async ({ page }) => {
  await page.goto(P1);
  const header = page.locator("header");
  await expect(header).toContainText("chương 1 · đoạn 1/3");
  await expect(header.getByText("takeiteasy —")).toBeHidden();
});

test("không có lỗi hydration", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(P1);
  await expect(page.getByTestId("original-col")).toBeVisible();
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});
