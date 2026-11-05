import { test, expect, type Page } from "@playwright/test";
import type { LookupRequest } from "@/lib/lookupTypes";
import { getPassage } from "@/lib/content";
import { LOUT, mockLookup } from "./lookup-helpers";
import { P, dismissFirstTimeHint, finishTyping, installSpies, selectText, type Spy } from "./selection-helpers";

// Tiêu chí nghiệm thu 1–6 — spec docs/superpowers/specs/2026-11-05-in-app-lookup-design.md.
// Desktop 1440×900. /api/lookup luôn bị giả (không gọi AI thật).

const popup = (page: Page) => page.getByTestId("selection-popup");
const card = (page: Page) => page.getByTestId("lookup-card");

async function openCard(page: Page, text: string) {
  await selectText(page, "original-text", text);
  await expect(popup(page)).toBeVisible();
  await popup(page).getByRole("button", { name: "tra nghĩa" }).click();
}

test.beforeEach(async ({ page }) => {
  await installSpies(page);
  await dismissFirstTimeHint(page);
});

async function openReader(page: Page) {
  await page.goto(P(1));
  await finishTyping(page, "click");
}

test('Khi bôi đen "lout" rồi bấm "tra nghĩa" thì thẻ hiện khung xương lúc chờ, rồi nghĩa + ví dụ, không mở tab mới', async ({ page }) => {
  await mockLookup(page, "hang");
  await openReader(page);
  await openCard(page, "lout");
  const skeleton = page.getByTestId("lookup-skeleton");
  await expect(skeleton).toBeVisible();
  await expect(card(page).getByTestId("lookup-body")).toHaveAttribute("aria-busy", "true");

  // Trang mới: lần này server trả kết quả.
  const calls: unknown[] = [];
  const page2 = await page.context().newPage();
  await installSpies(page2);
  await dismissFirstTimeHint(page2);
  await mockLookup(page2, { status: "ok", result: LOUT }, calls);
  await page2.goto(P(1));
  await finishTyping(page2, "click");
  // Không mở tab / cửa sổ mới: ngoài spy window.open, đếm cả trang của context và sự kiện popup
  const context = page2.context();
  const pagesBefore = context.pages().length;
  let newPages = 0;
  context.on("page", () => newPages++);
  page2.on("popup", () => newPages++);
  await openCard(page2, "lout");

  const c = card(page2);
  await expect(c).toContainText("lout");
  await expect(c).toContainText("/laʊt/");
  await expect(c).toContainText("danh từ");
  await expect(c).toContainText("nghĩa trong câu này");
  await expect(c).toContainText("kẻ thô lỗ");
  await expect(c).toContainText(LOUT.example.en);
  await expect(c).toContainText(LOUT.example.vi);
  await expect(c).toContainText("AI soạn · có thể chưa chuẩn");
  await expect(c.getByRole("link", { name: /xem thêm ở Cambridge/ })).toHaveAttribute("href", /cambridge\.org/);
  expect(await page2.evaluate(() => (window as unknown as Spy).__opened)).toEqual([]);
  expect(context.pages()).toHaveLength(pagesBefore);
  expect(newPages, "không có trang / popup mới").toBe(0);

  expect(calls).toHaveLength(1);
  const body = calls[0] as LookupRequest;
  expect(body.text).toBe("lout");
  expect(body.passageIndex).toBe(1);
  expect(getPassage("the-subtle-art", "ch01", 1)!.original.slice(body.start, body.end)).toBe("lout");
});

for (const explain of [false, true]) {
  test(`Khi bôi đen chữ ở đoạn 1 và 2${explain ? " (đang bật giải thích, có số tròn)" : ""} thì vị trí gửi đi khớp đúng chữ đó trong nguyên văn`, async ({ page }) => {
    const calls: unknown[] = [];
    await mockLookup(page, { status: "ok", result: LOUT }, calls);
    for (const [index, word] of [[1, "cheapskate"], [1, "perfect"], [2, "decades"]] as const) {
      await page.goto(P(index));
      await finishTyping(page, "click");
      if (explain) await page.keyboard.press("e");
      await openCard(page, word);
      await expect.poll(() => calls.length).toBeGreaterThan(0);
      const body = calls.pop() as LookupRequest;
      expect(body.text).toBe(word);
      expect(getPassage("the-subtle-art", "ch01", index)!.original.slice(body.start, body.end)).toBe(word);
    }
  });
}

test("Khi bôi đen chữ nằm trong cụm soạn sẵn (chronic) rồi bấm \"tra nghĩa\" thì mở tấm giải thích, không gọi AI", async ({ page }) => {
  const calls: unknown[] = [];
  await mockLookup(page, { status: "ok", result: LOUT }, calls);
  await openReader(page);
  await openCard(page, "chronic");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("chronic + noun");
  expect(calls).toEqual([]);
});

test('Khi thẻ "lout" đang hiện mà bấm nút nghe trong thẻ thì đọc đúng "lout"', async ({ page }) => {
  await mockLookup(page, { status: "ok", result: LOUT });
  await openReader(page);
  await openCard(page, "lout");
  await expect(card(page)).toContainText("kẻ thô lỗ");
  await card(page).getByRole("button", { name: "nghe: lout" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Spy).__spoken)).toContain("lout");
});

test('Khi bôi đen đúng 10 từ thì có "tra nghĩa"; thêm từ thứ 11 thì nút biến mất, hiện "dài quá để tra"', async ({ page }) => {
  await mockLookup(page, { status: "ok", result: LOUT });
  await openReader(page);
  await selectText(page, "original-text", "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler,");
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole("button", { name: "tra nghĩa" })).toBeVisible();
  await selectText(page, "original-text", "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a");
  await expect(popup(page).getByRole("button", { name: "tra nghĩa" })).toHaveCount(0);
  await expect(popup(page)).toContainText("dài quá để tra · xem bản dịch bên cạnh");
});

test("Khi server báo tạm dừng (503) thì thẻ báo lỗi dịu và có link mở Cambridge", async ({ page }) => {
  await mockLookup(page, { status: "unavailable", reason: "paused" });
  await openReader(page);
  await openCard(page, "lout");
  await expect(card(page)).toContainText("Tạm chưa tra được, thử lại sau nhé.");
  await expect(card(page).getByRole("link", { name: /mở Cambridge/ })).toHaveAttribute("href", /cambridge\.org/);
});

test("Khi thẻ đang hiện mà nhấn Escape thì thẻ ẩn; mở lại rồi bấm vào cột bản dịch thì thẻ cũng ẩn", async ({ page }) => {
  await mockLookup(page, { status: "ok", result: LOUT });
  await openReader(page);
  await openCard(page, "lout");
  await expect(card(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);

  await openCard(page, "lout");
  await expect(card(page)).toBeVisible();
  await page.getByTestId("translation-col").click();
  await expect(card(page)).toHaveCount(0);
});

/** Giả /api/lookup trả `result` sau `ms` (để kịp đo lúc khung xương đang hiện). */
async function mockLookupSlow(page: Page, result: typeof LOUT, ms = 600) {
  await page.route("**/api/lookup", async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", result }) });
  });
}

/** Thẻ dài (cho trường hợp popup phải cuộn bên trong). */
const LONG = {
  ...LOUT,
  meaning:
    "kẻ thô lỗ, cục cằn, cư xử khó coi; người lúc nào cũng ồn ào, chen ngang, không biết nói cảm ơn hay xin lỗi, đi đâu cũng làm người khác thấy phiền",
  example: {
    en: "My cousin acted like a lout at the wedding: he talked loudly during the vows, cut the cake line, and never thanked the hosts.",
    vi: "Ông anh họ tui cư xử như kẻ thô lỗ ở đám cưới: nói to lúc cô dâu chú rể đọc lời thề, chen hàng lấy bánh, rồi chẳng cảm ơn chủ nhà câu nào.",
  },
};

// "lout": dòng đầu, phía trên chật → popup ở dưới. "perfect": dòng cuối, phía trên đủ chỗ → popup ở trên.
for (const word of ["lout", "perfect"]) {
  test(`Khi bấm "tra nghĩa" trên "${word}" thì nút "tra nghĩa" đứng yên (±2px) từ lúc bấm, lúc chờ tới lúc có kết quả`, async ({ page }) => {
    await mockLookupSlow(page, LOUT);
    await openReader(page);
    await selectText(page, "original-text", word);
    const btn = popup(page).getByRole("button", { name: "tra nghĩa" });
    await expect(btn).toBeVisible();
    const b0 = (await btn.boundingBox())!;
    await btn.click();
    await expect(page.getByTestId("lookup-skeleton")).toBeVisible();
    const b1 = (await btn.boundingBox())!;
    await expect(card(page)).toContainText("kẻ thô lỗ");
    const b2 = (await btn.boundingBox())!;
    for (const [label, b] of [["lúc chờ", b1], ["có kết quả", b2]] as const) {
      expect(Math.abs(b.x - b0.x), `x ${label}`).toBeLessThanOrEqual(2);
      expect(Math.abs(b.y - b0.y), `y ${label}`).toBeLessThanOrEqual(2);
    }
    // Popup không đè lên chữ đang chọn
    const sel = await page.evaluate(() => {
      const r = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    const p = (await popup(page).boundingBox())!;
    expect(p.y >= sel.bottom || p.y + p.height <= sel.top, "popup không che vùng chọn").toBe(true);
  });
}

for (const word of ["lout", "perfect"]) {
  test(`Khi thẻ dài trên "${word}" thì popup nằm gọn giữa header và footer, thân thẻ cuộn bên trong`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 640 });
    await mockLookup(page, { status: "ok", result: LONG });
    await openReader(page);
    await selectText(page, "original-text", word);
    await popup(page).getByRole("button", { name: "tra nghĩa" }).click();
    await expect(card(page)).toContainText("đám cưới");
    const p = (await popup(page).boundingBox())!;
    const header = (await page.locator("header").boundingBox())!;
    const footer = (await page.locator("footer").boundingBox())!;
    expect(p.y, "đỉnh popup ≥ đáy header").toBeGreaterThanOrEqual(header.y + header.height);
    expect(p.y + p.height, "đáy popup ≤ đỉnh footer").toBeLessThanOrEqual(footer.y);
    // Link Cambridge (dòng chân) vẫn thấy, không bị đẩy khỏi màn hình
    const link = (await card(page).getByRole("link", { name: /Cambridge/ }).boundingBox())!;
    expect(link.y + link.height).toBeLessThanOrEqual(footer.y);
  });
}

test('Khi bấm "tra nghĩa" lần nữa lúc thẻ đang mở thì thẻ đóng (không tra lại); bấm lần ba thì mở lại bằng một lượt tra mới', async ({ page }) => {
  const calls: unknown[] = [];
  await mockLookup(page, { status: "ok", result: LOUT }, calls);
  await openReader(page);
  await openCard(page, "lout");
  const btn = popup(page).getByRole("button", { name: "tra nghĩa" });
  await expect(card(page)).toContainText("kẻ thô lỗ");
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await btn.click();
  await expect(card(page)).toHaveCount(0);
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(popup(page)).toBeVisible(); // vùng chọn vẫn còn
  expect(calls).toHaveLength(1);
  await btn.click();
  await expect(card(page)).toContainText("kẻ thô lỗ");
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  expect(calls).toHaveLength(2);
});

test("Khi bấm ✕ ở hàng nút của popup thì thẻ đóng, popup còn", async ({ page }) => {
  await mockLookup(page, { status: "ok", result: LOUT });
  await openReader(page);
  await openCard(page, "lout");
  await expect(card(page)).toContainText("kẻ thô lỗ");
  await popup(page).getByRole("toolbar").getByRole("button", { name: "đóng thẻ" }).click();
  await expect(card(page)).toHaveCount(0);
  await expect(popup(page)).toBeVisible();
});
