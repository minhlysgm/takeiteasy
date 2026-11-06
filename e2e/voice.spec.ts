import { test, expect, type Page } from "@playwright/test";
import { audioPath } from "@/lib/audio/audioPath";
import { getPassage } from "@/lib/content";
import { endAudio, pausedCount, played, spoken, stubAudio } from "./audio-helpers";
import { markCardsSeen } from "./card-helpers";

const URL1 = "/read/the-subtle-art/ch01/1";
const caption = getPassage("the-subtle-art", "ch01", 1)!.caption;
const captionSrc = audioPath("will", caption);
const EXAMPLE = "My room is a mess after the party.";

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
});

const readAloud = (page: Page) => page.getByRole("button", { name: /đọc to|■ dừng/ });

async function openFirstChunk(page: Page) {
  await page.getByRole("button", { name: /giải thích/ }).click();
  await page.getByTestId("reader").locator("button.font-hand").first().click();
  await expect(page.getByRole("dialog", { name: "be a mess" })).toBeVisible();
}

test.describe("đọc to dùng file audio", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
  });

  test("TC1 bấm 'đọc to' phát file caption giọng Will, nút thành '■ dừng'", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    expect(await played(page)).toEqual([captionSrc]);
  });

  test("TC2 bấm lại để dừng; phím s cũng bật / tắt", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("đọc to");
    expect(await pausedCount(page)).toBeGreaterThanOrEqual(1);

    const before = await pausedCount(page);
    await page.keyboard.press("s");
    await expect(readAloud(page)).toContainText("■ dừng");
    await page.keyboard.press("s");
    await expect(readAloud(page)).toContainText("đọc to");
    expect(await pausedCount(page)).toBeGreaterThan(before);
  });

  test("TC3 phát hết (ended) thì nút về 'đọc to'", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    await endAudio(page);
    await expect(readAloud(page)).toContainText("đọc to");
  });

  test("TC4 ▶ ví dụ trong drawer phát file; bấm lại dừng", async ({ page }) => {
    await page.goto(URL1);
    await openFirstChunk(page);
    const btn = page.getByRole("button", { name: new RegExp(`^(nghe|dừng): ${EXAMPLE}`) }).first();
    await btn.click();
    expect(await played(page)).toContain(audioPath("will", EXAMPLE));
    await expect(btn).toHaveAttribute("aria-label", /^dừng:/);
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", /^nghe:/);
  });

  test("TC5 đang đọc to, bấm ▶ ví dụ → footer về 'đọc to', ví dụ đang phát", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    await openFirstChunk(page);
    const btn = page.getByRole("button", { name: new RegExp(`^(nghe|dừng): ${EXAMPLE}`) }).first();
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", /^dừng:/);
    await expect(readAloud(page)).toContainText("đọc to");
  });

  test("TC6 đang đọc to, sang thẻ tiếp → dừng, nút ở thẻ 2 là 'đọc to'", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    await page.getByRole("button", { name: /tiếp →|thẻ tiếp/ }).first().click();
    await expect(page).toHaveURL(/\/ch01\/2$/);
    expect(await pausedCount(page)).toBeGreaterThanOrEqual(1);
    await expect(readAloud(page)).toContainText("đọc to");
  });

  test("TC7 đang phát ▶ ví dụ, Esc đóng drawer → dừng", async ({ page }) => {
    await page.goto(URL1);
    await openFirstChunk(page);
    const btn = page.getByRole("button", { name: new RegExp(`^(nghe|dừng): ${EXAMPLE}`) }).first();
    await btn.click();
    await expect(btn).toHaveAttribute("aria-label", /^dừng:/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await pausedCount(page)).toBeGreaterThanOrEqual(1);
  });
});

test.describe("file lỗi → giọng trình duyệt", () => {
  test("TC13 file 404 → đọc bằng giọng trình duyệt; hết thì nút về 'đọc to'", async ({ page }) => {
    await stubAudio(page, { status: 404 });
    await page.goto(URL1);
    await readAloud(page).click();
    await expect.poll(() => spoken(page)).toContain(caption);
    await expect(readAloud(page)).toContainText("■ dừng");
    await page.evaluate(() => window.__audio.utter?.onend?.(new Event("end") as SpeechSynthesisEvent));
    await expect(readAloud(page)).toContainText("đọc to");
  });
});
