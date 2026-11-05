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

test("pointer: coarse được giả lập ở project mobile", async ({ page }) => {
  await page.goto(P1);
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
});

test("footer dính đáy màn hình, kể cả khi cuộn giữa trang", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  const footer = page.locator("footer");
  const bottom = async () => (await footer.boundingBox())!.y + (await footer.boundingBox())!.height;
  expect(Math.abs((await bottom()) - 844)).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.scrollTo(0, 600));
  expect(Math.abs((await bottom()) - 844)).toBeLessThanOrEqual(1);
});

test("tiếp → sang đoạn 2, ← về đoạn 1", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: "tiếp →" }).tap();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await page.getByRole("button", { name: /← trước/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/1$/);
});

test("không thấy gợi ý phím ở footer", async ({ page }) => {
  await page.goto(P1);
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("footer kbd:visible")).toHaveCount(0);
});

test("mẹo lần đầu không nhắc tô đen", async ({ page }) => {
  await page.goto(P1);
  // span ngoài chứa cả hai câu; span trong cùng (cuối DOM) là câu đang hiển thị
  const hint = page.locator("span:visible", { hasText: /\/\/ mẹo/ }).last();
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('chạm "giải thích"');
  await expect(hint).not.toContainText("tô đen");
});

test.describe("360px", () => {
  test.use({ viewport: { width: 360, height: 780 } });
  test("footer một hàng, không cuộn ngang", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    const ys = await footer.getByRole("button").evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getBoundingClientRect().y),
    );
    expect(ys.length).toBeGreaterThanOrEqual(4);
    for (const y of ys) expect(Math.abs(y - ys[0])).toBeLessThanOrEqual(1);
    expect((await footer.boundingBox())!.height).toBeLessThanOrEqual(61);
  });
});
