import { test, expect, type Page } from "@playwright/test";
import type { LookupRequest } from "@/lib/lookupTypes";
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

  expect(calls).toHaveLength(1);
  const body = calls[0] as LookupRequest;
  expect(body.text).toBe("lout");
  expect(body.passageIndex).toBe(1);
  expect(body.sentence.startsWith("Charles Bukowski was")).toBe(true);
});

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
