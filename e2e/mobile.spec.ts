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

test("bật giải thích: 5 số cạnh cụm + 5 ghi chú tay giữa nguyên văn và bản dịch", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  const nums = page.getByRole("button", { name: /^xem cụm \d$/ });
  await expect(nums).toHaveCount(5);
  for (let i = 0; i < 5; i++) await expect(nums.nth(i)).toBeVisible();

  const notes = page.getByTestId("mobile-notes");
  await expect(notes).toBeVisible();
  const items = notes.getByRole("button");
  await expect(items).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const b = (await items.nth(i).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
  const text = (await page.locator("[data-chunk-id]").last().boundingBox())!;
  const nb = (await notes.boundingBox())!;
  const tr = (await page.getByTestId("translation-col").boundingBox())!;
  expect(nb.y).toBeGreaterThan(text.y);
  expect(nb.y + nb.height).toBeLessThan(tr.y);
});

test("chạm cụm gạch chân hoặc số thì mở đúng cụm", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await page.locator('[data-chunk-id="chronic"]').tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("// chunk 1/5");
  await dialog.getByRole("button", { name: /đóng/ }).tap();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "xem cụm 3" }).tap();
  await expect(page.getByRole("dialog")).toContainText("// chunk 3/5");
});

/** Chờ tấm/ngăn giải thích trượt xong: vị trí (x, y) không còn đổi giữa hai lần đo. */
async function waitSettled(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  let prev = "";
  await expect
    .poll(async () => {
      const b = await dialog.boundingBox();
      const pos = b ? `${b.x},${b.y}` : "none";
      const same = pos === prev;
      prev = pos;
      return same;
    })
    .toBe(true);
  return dialog;
}

/** Bật giải thích rồi chạm ghi chú tay thứ n (đếm từ 1). */
async function openNote(page: Page, n: number) {
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await page.getByTestId("mobile-notes").getByRole("button").nth(n - 1).tap();
  return waitSettled(page);
}

test("chạm ghi chú 4 → tấm trượt lên, trọn màn hình, đúng cụm", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 4);
  await expect(dialog).toContainText("// chunk 4/5");
  await expect(dialog.getByRole("heading", { name: "look to somebody for something" })).toBeVisible();
  const b = (await dialog.boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(844 + 1);
  expect(Math.abs(b.height - 0.85 * 844)).toBeLessThanOrEqual(4);
  expect(b.x).toBe(0);
  expect(b.width).toBe(390);
});

test("chunk sau → sang cụm 5; ✕ đóng; chạm vùng mờ đóng", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 4);
  await dialog.getByRole("button", { name: /chunk sau/ }).tap();
  await expect(dialog).toContainText("// chunk 5/5");
  await dialog.getByRole("button", { name: "đóng", exact: true }).tap();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByTestId("mobile-notes").getByRole("button").nth(3).tap();
  await waitSettled(page);
  await page.touchscreen.tap(195, 60);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("cụm 5 nhiều nội dung: nút chuyển cụm luôn thấy được", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 5);
  const prev = dialog.getByRole("button", { name: /chunk trước/ });
  await expect(prev).toBeVisible();
  const b = (await prev.boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(844);
});

test("không thấy gợi ý phím trong tấm", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 1);
  await expect(dialog.locator("kbd:visible")).toHaveCount(0);
});

test("đóng tấm hoặc chuyển đoạn khi đang mở thì trang cuộn lại được", async ({ page }) => {
  const overflow = () => page.evaluate(() => document.body.style.overflow);
  await page.goto(P1);
  const dialog = await openNote(page, 2);
  expect(await overflow()).toBe("hidden");
  await dialog.getByRole("button", { name: "đóng", exact: true }).tap();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await overflow()).toBe("");

  await page.getByTestId("mobile-notes").getByRole("button").nth(1).tap();
  await waitSettled(page);
  expect(await overflow()).toBe("hidden");
  await page.goto("/read/the-subtle-art/ch01/2");
  await expect(page.getByTestId("original-col")).toBeVisible();
  expect(await overflow()).toBe("");
});

test("tấm vẫn trọn màn hình khi đổi cỡ qua 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await page.getByTestId("reader").locator("button.font-hand:visible").first().tap();
  await waitSettled(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await waitSettled(page);
  const b = (await dialog.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  expect(b.y + b.height).toBeLessThanOrEqual(844 + 1);
});
