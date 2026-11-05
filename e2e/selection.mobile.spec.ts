import { test, expect, type Page } from "@playwright/test";
import { lookupUrl } from "@/lib/selection";
import { P, dismissFirstTimeHint, finishTyping, installSpies, selectText, type Spy } from "./selection-helpers";

// Tiêu chí nghiệm thu 1–9 + RF4 — spec docs/superpowers/specs/2026-11-05-touch-selection-design.md.
// Máy giả lập Pixel 7 (390×844, cảm ứng, pointer: coarse). Vùng chọn tạo bằng script.

const dock = (page: Page) => page.getByTestId("selection-dock");
const spy = <K extends keyof Spy>(page: Page, key: K) =>
  page.evaluate((k) => (window as unknown as Spy)[k], key);

test.beforeEach(async ({ page }) => {
  await installSpies(page);
});

test.describe("mẹo lần đầu đã tắt (thanh nằm ngay trên footer)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissFirstTimeHint(page);
    await page.goto(P(1));
    await finishTyping(page, "tap");
  });

  test('Khi bôi đen "chronic gambler" trong nguyên văn thì trong ≤ 0.5s thanh hiện ngay trên footer, có "nghe" và "tra nghĩa", không có popup', async ({ page }) => {
    const ms = await selectText(page, "original-text", "chronic gambler", "selection-dock");
    expect(ms, "thời gian tới khi thanh hiện (ms)").toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThanOrEqual(500);
    await expect(dock(page)).toBeVisible();
    await expect(dock(page)).toContainText("chronic gambler");
    await expect(dock(page).getByRole("button", { name: /nghe/ })).toBeVisible();
    await expect(dock(page).getByRole("button", { name: /tra nghĩa/ })).toBeVisible();
    await expect(page.getByTestId("selection-popup")).toHaveCount(0);
    const d = (await dock(page).boundingBox())!;
    const f = (await page.locator("footer").boundingBox())!;
    expect(Math.abs(d.y + d.height - f.y), "đáy thanh = đỉnh footer").toBeLessThanOrEqual(1);
  });

  test("Khi bỏ chọn thì thanh ẩn", async ({ page }) => {
    await selectText(page, "original-text", "chronic gambler");
    await expect(dock(page)).toBeVisible();
    await page.evaluate(() => window.getSelection()!.removeAllRanges());
    await page.touchscreen.tap(6, 400); // lề trái của vùng đọc: không chữ, không nút
    await expect(dock(page)).toBeHidden();
  });

  test('Khi chạm "nghe" thì đọc đúng "chronic gambler", vùng chọn và thanh vẫn còn', async ({ page }) => {
    await selectText(page, "original-text", "chronic gambler");
    await dock(page).getByRole("button", { name: /nghe/ }).tap();
    await expect.poll(() => spy(page, "__spoken")).toEqual(["chronic gambler"]);
    // quá hạn chờ ổn định (250ms) và hạn giữ (800ms) mà thanh vẫn còn
    await page.waitForTimeout(1100);
    await expect(dock(page)).toBeVisible();
    await expect(dock(page)).toContainText("chronic gambler");
    expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("chronic gambler");
  });

  test('Khi chạm "tra nghĩa" thì mở Cambridge tìm "chronic gambler"', async ({ page }) => {
    await selectText(page, "original-text", "chronic gambler");
    await dock(page).getByRole("button", { name: /tra nghĩa/ }).tap();
    await expect.poll(() => spy(page, "__opened")).toEqual([lookupUrl("chronic gambler")]);
  });

  test('Khi bôi đen câu 6 từ trở lên thì thanh chỉ có "nghe"', async ({ page }) => {
    await selectText(page, "original-text", "Charles Bukowski was an alcoholic, a womanizer");
    await expect(dock(page)).toBeVisible();
    await expect(dock(page).getByRole("button", { name: /nghe/ })).toBeVisible();
    await expect(dock(page).getByRole("button", { name: /tra nghĩa/ })).toHaveCount(0);
  });

  test("Khi bôi đen chữ trong bản dịch thì không hiện thanh", async ({ page }) => {
    await selectText(page, "translation-col", "con bạc kinh niên");
    expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("con bạc kinh niên");
    await page.waitForTimeout(600); // > 250ms chờ ổn định
    await expect(dock(page)).toHaveCount(0);
  });

  test("Khi tấm giải thích đang mở thì không hiện thanh", async ({ page }) => {
    await page.getByRole("button", { name: /giải thích/ }).tap();
    await page.getByTestId("mobile-notes").getByRole("button").first().tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await selectText(page, "original-text", "chronic gambler");
    await page.waitForTimeout(600);
    await expect(dock(page)).toHaveCount(0);
  });

  test("Khi thanh đang hiện mà chạm tiếp → thì sang đoạn 2 và thanh ẩn", async ({ page }) => {
    await selectText(page, "original-text", "chronic gambler");
    await expect(dock(page)).toBeVisible();
    await page.getByRole("button", { name: "tiếp →" }).tap();
    await expect(page).toHaveURL(/\/ch01\/2$/);
    await expect(dock(page)).toBeHidden();
    await page.waitForTimeout(600);
    await expect(dock(page)).toHaveCount(0);
  });
});

test.describe("320px", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("Khi ở 320px thì thanh nằm trọn bề ngang, không che nút footer, nút cao ≥ 44px; chữ dài cắt … trên một dòng", async ({ page }) => {
    await dismissFirstTimeHint(page);
    await page.goto(P(1));
    await finishTyping(page, "tap");
    await selectText(page, "original-text", "chronic gambler");
    await expect(dock(page)).toBeVisible();

    const d = (await dock(page).boundingBox())!;
    expect(d.x).toBeGreaterThanOrEqual(0);
    expect(d.x + d.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    const buttons = dock(page).getByRole("button");
    expect(await buttons.count()).toBe(2);
    for (const b of await buttons.all()) {
      expect((await b.boundingBox())!.height, await b.textContent()).toBeGreaterThanOrEqual(44);
    }

    const footerButtons = await page.locator("footer button:visible").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { t: e.textContent?.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      }),
    );
    expect(footerButtons.length).toBe(4);
    for (const fb of footerButtons) {
      const overlap =
        d.x < fb.right && d.x + d.width > fb.left && d.y < fb.bottom && d.y + d.height > fb.top;
      expect(overlap, `thanh che nút "${fb.t}"`).toBe(false);
    }

    await selectText(
      page,
      "original-text",
      "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout, a cheapskate",
    );
    await expect(dock(page)).toContainText("a cheapskate");
    const text = await dock(page).locator(".truncate").evaluate((el) => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
      return { cut: el.scrollWidth > el.clientWidth, h: el.getBoundingClientRect().height, lh, ellipsis: cs.textOverflow };
    });
    expect(text.cut, "chữ dài bị cắt").toBe(true);
    expect(text.ellipsis).toBe("ellipsis");
    expect(text.h, "một dòng").toBeLessThan(text.lh * 1.5);
  });
});

test("Mẹo lần đầu trên mobile có vế \"giữ tay lên chữ để bôi đen và nghe phát âm\"", async ({ page }) => {
  await page.goto(P(1));
  // span ngoài chứa cả hai câu; span trong cùng (cuối DOM) là câu đang hiển thị
  const hint = page.locator("span:visible", { hasText: /\/\/ mẹo/ }).last();
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText(
    '// mẹo: chạm "giải thích" để xem các cụm đáng học, giữ tay lên chữ để bôi đen và nghe phát âm',
  );
});
