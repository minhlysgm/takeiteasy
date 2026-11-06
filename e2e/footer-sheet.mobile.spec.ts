import { test, expect, type Page } from "@playwright/test";

// Footer màn đọc vừa 320px (nút theme lên header trên mobile) + lặt vặt tấm giải thích mobile.

const P = (n: number) => `/read/the-subtle-art/ch01/${n}`;

async function finishTyping(page: Page) {
  await page.getByTestId("translation-col").tap();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

async function openNote(page: Page, n: number) {
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await page.getByTestId("mobile-notes").getByRole("button").nth(n - 1).tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((e) => e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(
    page.viewportSize()!.height + 1,
  );
  await page.waitForTimeout(350); // tấm trượt xong
  return dialog;
}

for (const width of [320, 360, 390]) {
  test(`Khi màn ${width}px thì trang không cuộn ngang và mọi nút footer nằm trọn trong màn hình`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    for (const n of [1, 2, 3]) {
      await page.goto(P(n));
      await expect(page.getByTestId("caption-col")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `đoạn ${n}`).toBeLessThanOrEqual(width);
      const boxes = await page.locator("footer button:visible").evaluateAll((els) =>
        els.map((e) => ({ t: e.textContent?.trim(), l: e.getBoundingClientRect().left, r: e.getBoundingClientRect().right })),
      );
      expect(boxes.length).toBe(4); // giải thích, đọc to, ←, tiếp
      for (const b of boxes) {
        expect(b.l, `"${b.t}" mép trái`).toBeGreaterThanOrEqual(0);
        expect(b.r, `"${b.t}" mép phải`).toBeLessThanOrEqual(width);
      }
    }
  });
}

test("Khi ở 320px và bật giải thích thì header vẫn không cắt chữ \"· explain\"", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(P(1));
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  // phần chữ tự cắt "…" của nút tiêu đề (nút mở danh sách đoạn)
  const title = page.locator('[data-testid="jump-trigger-mobile"] > span:first-child');
  await expect(title).toContainText("· explain");
  expect(await title.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
});

test("Khi ở mobile thì nút theme nằm ở header (≥ 44×44), bấm thì đổi theme; footer không còn nút theme", async ({ page }) => {
  await page.goto(P(1));
  const btn = page.locator("header").getByRole("button", { name: /theme/ });
  await expect(btn).toBeVisible();
  const box = (await btn.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("footer").getByRole("button", { name: /theme/ })).toBeHidden();
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const before = await theme();
  await btn.tap();
  await expect.poll(theme).not.toBe(before);
});

test("Khi ở desktop thì nút theme vẫn ở footer, header không có", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(P(1));
  await expect(page.locator("footer").getByRole("button", { name: /theme/ })).toBeVisible();
  await expect(page.locator("header").getByRole("button", { name: /theme/ })).toBeHidden();
});

test("Khi ở mobile thì nút \"←\" footer rộng ≥ 44px và cách \"tiếp\" ≥ 8px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(P(2));
  const prev = (await page.locator("footer").getByRole("button", { name: /trước/ }).boundingBox())!;
  const next = (await page.locator("footer").getByRole("button", { name: /tiếp/ }).boundingBox())!;
  expect(prev.width).toBeGreaterThanOrEqual(44);
  expect(next.x - (prev.x + prev.width)).toBeGreaterThanOrEqual(8);
});

test("Khi ở mobile thì vạch tiến độ co giãn bằng transform 300ms ease-out, không animate width", async ({ page }) => {
  await page.goto(P(2));
  const bar = page.getByTestId("mobile-progress");
  const cs = await bar.evaluate((e) => {
    const s = getComputedStyle(e);
    return { prop: s.transitionProperty, dur: s.transitionDuration, ease: s.transitionTimingFunction, tf: s.transform, w: e.getBoundingClientRect().width };
  });
  expect(cs.prop).toBe("transform");
  expect(cs.dur).toBe("0.3s");
  expect(cs.ease).toBe("cubic-bezier(0, 0, 0.2, 1)");
  expect(cs.tf).toMatch(/^matrix\(0\.66/); // đoạn 2/3
});

test("Khi mở tấm thì vùng mờ phía sau chuyển động ease-out", async ({ page }) => {
  await page.goto(P(1));
  await openNote(page, 1);
  const ease = await page.getByTestId("drawer-backdrop").evaluate((e) => getComputedStyle(e).transitionTimingFunction);
  expect(ease).toBe("cubic-bezier(0, 0, 0.2, 1)");
});

test("Khi mở tấm thì không có thanh kéo, ✕ to rõ (≥ 18px, màu chữ thường) và tên cụm nằm gần dòng \"// chunk\"", async ({ page }) => {
  await page.goto(P(1));
  const dialog = await openNote(page, 2);
  await expect(dialog.getByTestId("sheet-handle")).toHaveCount(0);
  const close = dialog.getByRole("button", { name: "đóng", exact: true });
  const x = await close.evaluate((b) => {
    const glyph = [...b.querySelectorAll("span")].find((s) => s.offsetParent !== null)!;
    const probe = document.createElement("span");
    probe.style.color = "var(--text)";
    document.body.appendChild(probe);
    const text = getComputedStyle(probe).color;
    probe.remove();
    return { size: parseFloat(getComputedStyle(glyph).fontSize), color: getComputedStyle(glyph).color, text };
  });
  expect(x.size).toBeGreaterThanOrEqual(18);
  expect(x.color).toBe(x.text);
  const label = (await dialog.getByText(/^\/\/ chunk \d\/\d$/).boundingBox())!;
  const head = (await dialog.getByRole("heading").boundingBox())!;
  expect(head.y - (label.y + label.height)).toBeLessThanOrEqual(22); // trước khi sửa: ~36px
});

test.describe("màn hình thấp 390×600", () => {
  test.use({ viewport: { width: 390, height: 600 } });

  test("Khi tấm còn nội dung bên dưới thì có dải mờ ở đáy vùng cuộn; cuộn tới cuối thì dải mờ ẩn", async ({ page }) => {
    await page.goto(P(1));
    const dialog = await openNote(page, 4);
    const fade = dialog.getByTestId("sheet-fade");
    await expect(fade).toHaveCSS("opacity", "1");
    const scroller = dialog.getByTestId("sheet-scroll");
    const fb = (await fade.boundingBox())!;
    const sb = (await scroller.boundingBox())!;
    expect(Math.abs(fb.y + fb.height - (sb.y + sb.height))).toBeLessThanOrEqual(1); // nằm sát đáy vùng cuộn
    await scroller.evaluate((e) => e.scrollTo({ top: e.scrollHeight }));
    await expect(fade).toHaveCSS("opacity", "0");
  });

  test("Khi tấm đủ ngắn để không cuộn thì không có dải mờ", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.goto(P(1));
    const dialog = await openNote(page, 1);
    const scroller = dialog.getByTestId("sheet-scroll");
    expect(await scroller.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
    await expect(dialog.getByTestId("sheet-fade")).toHaveCSS("opacity", "0");
  });
});
