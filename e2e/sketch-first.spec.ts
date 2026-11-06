import { test, expect, type Page } from "@playwright/test";
import { getPassage } from "@/lib/content";
import { markCardsSeen } from "./card-helpers";
import { LIFE, mockLookup } from "./lookup-helpers";
import { dismissFirstTimeHint, selectText } from "./selection-helpers";

// Luồng "vẽ trước" (spec 2026-11-06, mục B + tiêu chí 1–5, 7): mở thẻ → hình vẽ trước; vẽ xong → mô tả hiện dần,
// bản dịch gõ; gõ xong → ý chính + ghi công. Mỗi test dùng context mới nên `tie:sketch-seen:*` không rò giữa các test.

const BOOK = "the-subtle-art";
const CH = "ch01";
const P = (n: number) => `/read/${BOOK}/${CH}/${n}`;
const url = (n: number) => new RegExp(`/${CH}/${n}$`);
const CREDIT = "Ý tưởng từ chương 1, The Subtle Art of Not Giving a F*ck — Mark Manson. Hình và lời: takeiteasy.";
const PASSAGE_1 = getPassage(BOOK, CH, 1)!;
const PASSAGE_2 = getPassage(BOOK, CH, 2)!;

test.use({ viewport: { width: 1440, height: 900 } });

/** Ghi lại nếu chữ "đang gõ…" từng xuất hiện trong trang (kể cả chỉ một khung hình). */
async function watchTyping(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __typed: boolean };
    w.__typed = false;
    new MutationObserver(() => {
      if (!w.__typed && document.body?.textContent?.includes("đang gõ…")) w.__typed = true;
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
}
const everTyped = (page: Page) => page.evaluate(() => (window as unknown as { __typed: boolean }).__typed);

/** Hình đang chờ hoặc đang vẽ: đã hydrate, chưa xong */
async function expectSketchRunning(page: Page) {
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", /waiting|drawing/);
}

/** Mọi thứ đã hiện đủ, không còn gõ chữ */
async function expectAllShown(page: Page) {
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("caption-text")).toBeVisible();
  await expect(page.getByTestId("caption-waiting")).toHaveCount(0);
  await expect(page.getByTestId("translation-waiting")).toHaveCount(0);
  await expect(page.getByText("đang gõ…")).toHaveCount(0);
  await expect(page.getByTestId("credit")).toBeVisible();
}

test("1: mở thẻ 1 lần đầu → hình đang vẽ, mô tả + bản dịch đang chờ", async ({ page }) => {
  await page.goto(P(1));
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", /waiting|drawing/);
  await expect(page.getByTestId("caption-waiting")).toHaveText("đang vẽ…");
  await expect(page.getByTestId("caption-text")).toBeHidden();
  await expect(page.getByTestId("translation-waiting")).toHaveText("bản dịch hiện sau khi vẽ xong.");
  await expect(page.getByText("đang gõ…")).toHaveCount(0);
  await expect(page.getByTestId("credit")).toHaveCount(0);
  // Hình chạy trước: tự bắt đầu vẽ, không chờ gì khác
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await expect(page.getByTestId("caption-text")).toBeHidden();
});

test("1b: thứ tự cột trái: // hình → // mô tả", async ({ page }) => {
  await markCardsSeen(page);
  await page.goto(P(1));
  const sketch = (await page.getByTestId("sketch").boundingBox())!;
  const label = (await page.getByText("// mô tả", { exact: true }).boundingBox())!;
  const caption = (await page.getByTestId("caption-text").boundingBox())!;
  expect(sketch.y + sketch.height).toBeLessThanOrEqual(label.y);
  expect(label.y).toBeLessThan(caption.y);
});

test("2: vẽ xong → mô tả hiện, bản dịch gõ; gõ xong → ý chính + ghi công", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(P(1));
  await expectSketchRunning(page);
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done", { timeout: 15_000 });
  const caption = page.getByTestId("caption-text");
  await expect(caption).toBeVisible();
  await expect(caption).toContainText("is a mess");
  await expect(caption).toContainText("piling up");
  await expect(page.getByTestId("caption-waiting")).toHaveCount(0);
  await expect(page.getByTestId("translation-waiting")).toHaveCount(0);
  await expect(page.getByText("đang gõ…")).toBeVisible();
  await expect(page.getByTestId("credit")).toHaveCount(0);
  await expect(page.getByText("// ý chính")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("credit")).toBeVisible();
  await expect(page.getByText("đang gõ…")).toHaveCount(0);
});

test("3: bấm 'xem ngay ⏭' khi đang vẽ → hình đủ, mô tả hiện, bản dịch bắt đầu gõ", async ({ page }) => {
  await page.goto(P(1));
  const sketch = page.getByTestId("sketch");
  await expect(sketch).toHaveAttribute("data-state", "drawing");
  await page.getByRole("button", { name: "xem ngay ⏭" }).click();
  await expect(sketch).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("caption-text")).toBeVisible();
  await expect(page.getByTestId("caption-waiting")).toHaveCount(0);
  await expect(page.getByTestId("translation-waiting")).toHaveCount(0);
  await expect(page.getByText("đang gõ…")).toBeVisible();
  // Mô tả hiện dần (fade), không bật ra
  await expect(page.locator('[data-testid="caption-col"] .animate-caption-in')).toHaveCount(1);
  // Đang gõ: phím bất kỳ chỉ bỏ qua hiệu ứng gõ (như trước), enter lần sau mới sang thẻ
  await page.keyboard.press("Enter");
  await expect(page.getByText("đang gõ…")).toHaveCount(0);
  await expect(page.getByTestId("credit")).toBeVisible();
  await expect(page).toHaveURL(url(1));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(url(2));
});

test("4: thẻ đã xem → hiện đủ ngay; '↻ vẽ lại' thì mô tả vẫn hiện, bản dịch không gõ lại", async ({ page }) => {
  await markCardsSeen(page);
  await watchTyping(page);
  await page.goto(P(1));
  await expectAllShown(page);
  await page.getByRole("button", { name: "↻ vẽ lại" }).click();
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await expect(page.getByTestId("caption-text")).toBeVisible();
  await expect(page.getByTestId("credit")).toBeVisible();
  await expect(page.getByTestId("caption-waiting")).toHaveCount(0);
  await page.getByRole("button", { name: "xem ngay ⏭" }).click();
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
  await expectAllShown(page);
  expect(await everTyped(page)).toBe(false);
});

test("5: reduced-motion → hiện đủ ngay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await watchTyping(page);
  await page.goto(P(1));
  await expectAllShown(page);
  await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
  expect(await everTyped(page)).toBe(false);
});

test("7: ghi công đúng ở cả 3 thẻ", async ({ page }) => {
  await markCardsSeen(page);
  for (const n of [1, 2, 3]) {
    await page.goto(P(n));
    await expect(page.getByTestId("credit")).toHaveText(CREDIT);
  }
});

test("RF1: enter lúc đang vẽ → hiện đủ ngay, chưa chuyển thẻ; enter lần 2 → thẻ 2", async ({ page }) => {
  await watchTyping(page);
  await page.goto(P(1));
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await page.keyboard.press("Enter");
  await expectAllShown(page);
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(url(1));
  expect(await everTyped(page)).toBe(false);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(url(2));
});

test("RF1: phím bất kỳ lúc hình còn chờ → hiện đủ ngay; Esc thì không", async ({ page }) => {
  await page.goto(P(1));
  await expectSketchRunning(page);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("caption-waiting")).toBeVisible();
  await page.keyboard.press("x");
  await expectAllShown(page);
  await expect(page).toHaveURL(url(1));
});

test("RF1: bấm 'giải thích' lúc đang vẽ → hiện đủ + bật giải thích", async ({ page }) => {
  await page.goto(P(1));
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await page.getByRole("button", { name: /giải thích/ }).click();
  await expectAllShown(page);
  await expect(page.locator("header")).toContainText("explain");
  await expect(page.getByText(/chunks đáng học/)).toBeVisible();
});

test("RF2: chuyển sang thẻ 2 giữa lúc vẽ → thẻ 2 bắt đầu lại 'đang vẽ…'", async ({ page }) => {
  await page.goto(P(1));
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  // Thẻ 1 đang vẽ dở → bấm "tiếp →" ở footer
  await page.getByRole("button", { name: "tiếp →" }).click();
  await expect(page).toHaveURL(url(2));
  await expect(page.getByRole("img", { name: PASSAGE_2.sketch.alt, exact: true })).toBeVisible();
  await expect(page.getByTestId("caption-waiting")).toBeVisible();
  await expect(page.getByTestId("caption-text")).toBeHidden();
  await expect(page.getByTestId("translation-waiting")).toBeVisible();
  await expectSketchRunning(page);
});

test("RF2: chuyển thẻ giữa lúc gõ (nút, back) → thẻ mới không mang chữ đã gõ / mô tả của thẻ cũ", async ({ page }) => {
  await page.goto(P(1));
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await page.getByRole("button", { name: "xem ngay ⏭" }).click();
  await expect(page.getByText("đang gõ…")).toBeVisible();
  // Thẻ 1 đã xem (xem ngay) nhưng đang gõ → sang thẻ 2 chưa xem
  await page.getByRole("button", { name: "tiếp →" }).click();
  await expect(page).toHaveURL(url(2));
  await expect(page.getByRole("img", { name: PASSAGE_2.sketch.alt, exact: true })).toBeVisible();
  await expect(page.getByTestId("caption-waiting")).toBeVisible();
  await expect(page.getByTestId("translation-waiting")).toBeVisible();
  await expect(page.getByText("đang gõ…")).toHaveCount(0);
  await expectSketchRunning(page);
  // Thẻ 2: xem ngay → đang gõ → back về thẻ 1 (đã xem) → hiện đủ ngay, không gõ lại
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await page.getByRole("button", { name: "xem ngay ⏭" }).click();
  await expect(page.getByText("đang gõ…")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(url(1));
  await expectAllShown(page);
  // forward về thẻ 2 (đã xem) → cũng hiện đủ
  await page.goForward();
  await expect(page).toHaveURL(url(2));
  await expect(page.getByRole("img", { name: PASSAGE_2.sketch.alt, exact: true })).toBeVisible();
  await expectAllShown(page);
});

test("RF3: tải lại thẻ đã xem → không gõ lại bản dịch", async ({ page }) => {
  await page.goto(P(1));
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  await page.getByRole("button", { name: "xem ngay ⏭" }).click();
  await expect(page.getByText("đang gõ…")).toBeVisible();
  await watchTyping(page);
  await page.reload();
  await expectAllShown(page);
  expect(await everTyped(page)).toBe(false);
});

test("6: header/footer ghi thẻ; danh sách nhảy nhanh ghi thẻ + câu mở đầu từ đoạn mô tả", async ({ page }) => {
  await markCardsSeen(page);
  await page.goto(P(2));
  await expect(page.locator("header")).toContainText("chương 1 · thẻ 2/3");
  await expect(page.locator("footer")).toContainText("thẻ tiếp");
  await page.keyboard.press("g");
  const list = page.getByRole("dialog", { name: "danh sách thẻ" });
  await expect(list).toBeVisible();
  await expect(list).toContainText("thẻ đã đọc");
  await expect(list).toContainText("It’s three in the morning and she still can’t fall asleep.");
  await expect(list).not.toContainText("đoạn");
  // nhãn cột trái
  await page.keyboard.press("Escape");
  await expect(page.getByText("// mô tả", { exact: true })).toBeVisible();
});

test("8: chunk trong mô tả gạch chân, có số, ghi chú lề; bấm mở drawer đúng chunk", async ({ page }) => {
  await markCardsSeen(page);
  await dismissFirstTimeHint(page);
  await page.goto(P(1));
  await expectAllShown(page);
  await page.getByRole("button", { name: /giải thích/ }).click();
  await expect(page.locator("header")).toContainText("explain");

  const caption = page.getByTestId("caption-text");
  const chunks = PASSAGE_1.chunks;
  expect(chunks).toHaveLength(4);
  await expect(caption.locator("[data-chunk-id]")).toHaveCount(4);
  // Gạch chân + số: mỗi chunk có cụm chữ nằm trong caption-text, số tròn (data-n) đi kèm
  await expect(caption.getByTestId("chunk-badge")).toHaveCount(4);
  for (const [i, c] of chunks.entries()) {
    const span = caption.locator(`[data-chunk-id="${c.id}"]`);
    await expect(span).toHaveText(c.match);
    await expect(span).toHaveCSS("cursor", "pointer");
    await expect(caption.getByTestId("chunk-badge").nth(i)).toHaveAttribute("data-n", String(i + 1));
  }
  // Ghi chú lề: nhãn của chunk 1 hiện cạnh đoạn mô tả
  const margin = page.getByTestId("reader").locator("button.font-hand", { hasText: chunks[0].label });
  await expect(margin).toBeVisible();

  // Bấm chunk "piling up" → drawer có headword của chunk đó
  const pile = chunks.find((c) => c.match === "piling up")!;
  await caption.locator(`[data-chunk-id="${pile.id}"]`).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAccessibleName(pile.headword);
  await expect(drawer.getByRole("heading", { name: pile.headword })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("9: bôi đen 'piling up' trong mô tả → popup nghe/tra nghĩa; tra nghĩa gửi đúng start/end", async ({ page }) => {
  await markCardsSeen(page);
  await dismissFirstTimeHint(page);
  const calls: unknown[] = [];
  await mockLookup(page, { status: "ok", result: LIFE }, calls);
  await page.goto(P(1));
  await expectAllShown(page);

  await selectText(page, "caption-text", "piling up");
  const popup = page.getByTestId("selection-popup");
  await expect(popup).toBeVisible();
  await expect(popup.getByRole("button", { name: "nghe" })).toBeVisible();
  // "piling up" là chunk soạn sẵn → "tra nghĩa" mở drawer của chunk (đã có dữ liệu biên tập), không gọi AI
  await popup.getByRole("button", { name: "tra nghĩa" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toHaveAccessibleName("pile up");
  expect(calls).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  // Vùng chọn vượt ra ngoài chunk ("letters piling up") → tra nghĩa gửi đúng start/end trong nguyên văn
  const phrase = "letters piling up";
  await selectText(page, "caption-text", phrase);
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: "tra nghĩa" }).click();
  await expect(page.getByTestId("lookup-card")).toBeVisible();
  expect(calls).toHaveLength(1);
  const body = calls[0] as { text: string; start: number; end: number; passageIndex: number };
  const at = PASSAGE_1.caption.indexOf(phrase);
  expect(at).toBeGreaterThan(0);
  expect(body.text).toBe(phrase);
  expect(body.passageIndex).toBe(1);
  expect(body.start).toBe(at);
  expect(body.end).toBe(at + phrase.length);
  expect(PASSAGE_1.caption.slice(body.start, body.end)).toBe(phrase);
});
