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

test("header không cắt chữ \"· explain\" khi bật giải thích", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  const title = page.locator("header > div.truncate");
  await expect(title).toContainText("· explain");
  expect(await title.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
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
    // mỗi nút chỉ một dòng chữ (không bị gãy dòng trong nút 38px)
    const wrapped = await footer.getByRole("button").evaluateAll((els) =>
      els
        .filter((e) => (e as HTMLElement).offsetParent !== null)
        .filter((e) => e.scrollHeight > e.clientHeight)
        .map((e) => e.textContent),
    );
    expect(wrapped).toEqual([]);
  });
});

test.describe("chuột ở bề ngang hẹp (có gợi ý phím)", () => {
  for (const w of [360, 390]) {
    test.describe(`${w}px`, () => {
      test.use({ viewport: { width: w, height: 780 }, hasTouch: false, isMobile: false });
      test("footer không cuộn ngang, nút một dòng", async ({ page }) => {
        await page.goto(P1);
        const footer = page.locator("footer");
        await expect(footer).toBeVisible();
        expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(false);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
        const wrapped = await footer.getByRole("button").evaluateAll((els) =>
          els
            .filter((e) => (e as HTMLElement).offsetParent !== null)
            .filter((e) => e.scrollHeight > e.clientHeight)
            .map((e) => e.textContent),
        );
        expect(wrapped).toEqual([]);
      });
    });
  }
});

test("bật giải thích: 5 số cạnh cụm + 5 ghi chú tay giữa nguyên văn và bản dịch", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  const nums = page.getByTestId("chunk-badge");
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
  await page.getByTestId("chunk-badge").nth(2).tap();
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

test.describe("màn hình thấp 390×600", () => {
  test.use({ viewport: { width: 390, height: 600 } });

  test("cụm 5 nhiều nội dung: vùng cuộn tràn, nút chuyển cụm luôn thấy được", async ({ page }) => {
    await page.goto(P1);
    const dialog = await openNote(page, 5);
    const scroller = dialog.getByTestId("sheet-scroll");
    const { sh, ch } = await scroller.evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight }));
    expect(sh).toBeGreaterThan(ch);
    const prev = dialog.getByRole("button", { name: /chunk trước/ });
    await expect(prev).toBeVisible();
    const b = (await prev.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(600);
  });

  test("chuyển cụm thì vùng cuộn về đầu", async ({ page }) => {
    await page.goto(P1);
    const dialog = await openNote(page, 5);
    const scroller = dialog.getByTestId("sheet-scroll");
    await scroller.evaluate((e) => (e.scrollTop = e.scrollHeight));
    expect(await scroller.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
    await dialog.getByRole("button", { name: /chunk trước/ }).tap();
    await expect(dialog).toContainText("// chunk 4/5");
    expect(await scroller.evaluate((e) => e.scrollTop)).toBe(0);
  });
});

test("mọi nút trong tấm có vùng chạm ≥ 44×44", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 1);
  const buttons = dialog.getByRole("button");
  const n = await buttons.count();
  expect(n).toBeGreaterThan(3);
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible())) continue;
    const box = (await b.boundingBox())!;
    const label = (await b.getAttribute("aria-label")) ?? (await b.textContent());
    expect(box.width, `${label} rộng`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${label} cao`).toBeGreaterThanOrEqual(44);
  }
});

test("không thấy gợi ý phím trong tấm", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 1);
  await expect(dialog.locator("kbd:visible")).toHaveCount(0);
});

test("đóng tấm thì trang cuộn lại được", async ({ page }) => {
  const overflow = () => page.evaluate(() => document.body.style.overflow);
  await page.goto(P1);
  const dialog = await openNote(page, 2);
  expect(await overflow()).toBe("hidden");
  await dialog.getByRole("button", { name: "đóng", exact: true }).tap();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await overflow()).toBe("");

});

test("chuyển đoạn phía client khi tấm đang mở thì trang cuộn lại được", async ({ page }) => {
  const overflow = () => page.evaluate(() => document.body.style.overflow);
  const P2 = "/read/the-subtle-art/ch01/2";
  await page.goto(P2);
  await finishTyping(page);
  // đánh dấu trên window: còn nguyên sau mỗi bước = không tải lại trang (điều hướng phía client)
  await page.evaluate(() => ((window as unknown as { __tieMarker: number }).__tieMarker = 1));
  const markerAlive = () =>
    page.evaluate(() => (window as unknown as { __tieMarker?: number }).__tieMarker === 1);

  await page.getByRole("button", { name: /← trước/ }).tap();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await openNote(page, 2);
  expect(await overflow()).toBe("hidden");
  expect(await markerAlive()).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(/\/ch01\/2$/);
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await overflow()).toBe("");
  expect(await markerAlive()).toBe(true);
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

// ---- Sửa sau trạm ⑥ (2026-11-05) ----

test.describe("số tròn không rời cụm, dấu câu không rớt xuống đầu dòng", () => {
  for (const width of [320, 360, 390, 412, 720, 790]) {
    test(`${width}px, cả 3 đoạn`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      for (const n of [1, 2, 3]) {
        await page.goto(`/read/the-subtle-art/ch01/${n}`);
        await finishTyping(page);
        // 320px: footer tràn ngang, nút bị đẩy dưới mép màn hình (backlog "lặt vặt tấm giải thích mobile")
        await page.keyboard.press("e");
        await expect(page.getByTestId("chunk-badge").first()).toBeVisible();
        const broken = await page.evaluate(() => {
          const out: string[] = [];
          const chunks = document.querySelectorAll('[data-testid="original-text"] [data-chunk-id]');
          const badges = document.querySelectorAll<HTMLElement>('[data-testid="chunk-badge"]');
          for (const [i, badge] of badges.entries()) {
            const b = badge.getBoundingClientRect();
            const mid = (r: DOMRect) => r.top + r.height / 2;
            // cụm ngay trước số: dòng cuối của cụm phải chứa số
            const rects = chunks[i].getClientRects();
            const last = rects[rects.length - 1];
            if (Math.abs(mid(last) - mid(b)) > 6) out.push(`số ${badge.dataset.n} rời cụm`);
            // dấu câu ngay sau số: cùng dòng với số
            let next = badge.nextSibling; // bỏ qua SVG gạch chân chèn vào DOM
            while (next && next.nodeType === Node.ELEMENT_NODE && (next as Element).tagName.toLowerCase() === "svg") next = next.nextSibling;
            if (next?.nodeType === Node.TEXT_NODE && /^[,.;:!?)]/.test(next.textContent ?? "")) {
              const range = document.createRange();
              range.setStart(next, 0);
              range.setEnd(next, 1);
              if (Math.abs(mid(range.getBoundingClientRect()) - mid(b)) > 6) out.push(`dấu sau số ${badge.dataset.n} rớt dòng`);
            }
          }
          return out;
        });
        expect(broken, `đoạn ${n}`).toEqual([]);
      }
    });
  }
});

test("bôi đen nguyên văn khi bật giải thích không dính số", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  const selected = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-testid="original-text"]')!;
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(el);
      sel.addRange(r);
      const s = sel.toString();
      sel.removeAllRanges();
      return s;
    });
  const plain = await selected();
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await expect(page.getByTestId("chunk-badge")).toHaveCount(5);
  expect(await selected()).toBe(plain);
});

test("bật giải thích: bản dịch vẫn rõ trên mobile", async ({ page }) => {
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await expect(page.getByText("5 chunks đáng học")).toBeVisible();
  // chờ hiệu ứng mờ dần (nếu có) chạy xong rồi mới đo
  const opacity = await page.getByTestId("translation-col").evaluate(async (el) => {
    await new Promise((r) => setTimeout(r, 50));
    await Promise.all(el.getAnimations().map((a) => a.finished));
    return getComputedStyle(el).opacity;
  });
  expect(opacity).toBe("1");
});

test("khoá cuộn theo bề ngang khi đổi cỡ lúc tấm đang mở", async ({ page }) => {
  const overflow = () => page.evaluate(() => document.body.style.overflow);
  await page.goto(P1);
  await openNote(page, 1);
  expect(await overflow()).toBe("hidden");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(overflow).toBe("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(overflow).toBe("hidden");
  await page.getByRole("dialog").getByRole("button", { name: "đóng", exact: true }).tap();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await overflow()).toBe("");
});

test("mở tấm ở desktop rồi thu về 390px thì khoá cuộn", async ({ page }) => {
  const overflow = () => page.evaluate(() => document.body.style.overflow);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(P1);
  await finishTyping(page);
  await page.getByRole("button", { name: /giải thích/ }).tap();
  await page.getByTestId("reader").locator("button.font-hand:visible").first().tap();
  await waitSettled(page);
  expect(await overflow()).toBe("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(overflow).toBe("hidden");
});

test("Tab không thoát ra ngoài tấm; tấm báo là modal", async ({ page }) => {
  await page.goto(P1);
  const dialog = await openNote(page, 3); // cụm giữa: cả 2 nút chuyển cụm đều bật
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await inside(), `Tab lần ${i + 1}`).toBe(true);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await inside(), `Shift+Tab lần ${i + 1}`).toBe(true);
  }
});

test('nút "đã hiểu" của mẹo lần đầu có vùng chạm ≥ 44px', async ({ page }) => {
  await page.goto(P1);
  const btn = page.getByRole("button", { name: "đã hiểu" });
  await expect(btn).toBeVisible();
  const b = (await btn.boundingBox())!;
  expect(b.height).toBeGreaterThanOrEqual(44);
  expect(b.width).toBeGreaterThanOrEqual(44);
});

test("tablet 900px: cột đọc không trải hết bề ngang, căn giữa", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto(P1);
  for (const id of ["original-col", "translation-col"]) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.width, id).toBeLessThanOrEqual(640);
    expect(Math.abs(b.x - (900 - (b.x + b.width))), `${id} căn giữa`).toBeLessThanOrEqual(2);
  }
});
