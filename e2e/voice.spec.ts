import { test, expect, type Page } from "@playwright/test";
import { audioPath } from "@/lib/audio/audioPath";
import { VOICES } from "@/lib/audio/voices";
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

const readAloud = (page: Page) => page.getByRole("button", { name: /^(s )?(đọc to|dừng)$/ });

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

  test("giữ phím s (auto-repeat) chỉ bật một lần, không bật/tắt liên tục", async ({ page }) => {
    await page.goto(URL1);
    await page.keyboard.press("s");
    await expect(readAloud(page)).toContainText("■ dừng");
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", repeat: true, bubbles: true }));
    });
    await expect(readAloud(page)).toContainText("■ dừng");
    expect(await played(page)).toEqual([captionSrc]);
    expect(await pausedCount(page)).toBe(0); // không có lần dừng nào do lặp phím
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

test("không có Web Speech + file 404 → nút không kẹt ở '■ dừng'", async ({ page }) => {
  await stubAudio(page, { status: 404, speech: false });
  await page.goto(URL1);
  expect(await page.evaluate(() => window.speechSynthesis)).toBeUndefined();
  await readAloud(page).click();
  await expect(readAloud(page)).toHaveAccessibleName(/^(s )?đọc to$/);
});

test.describe("chọn giọng (desktop)", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
  });

  const trigger = (page: Page) => page.getByTestId("voice-trigger");
  const picker = (page: Page) => page.getByTestId("voice-picker");
  const radio = (page: Page, name: string) => picker(page).getByRole("radio", { name: new RegExp(`^${name}`) });

  test("TC8 bấm 'giọng: Will' thấy 5 giọng theo thứ tự, Will được chọn; Esc đóng; phím v mở lại", async ({ page }) => {
    await page.goto(URL1);
    await expect(trigger(page)).toContainText("giọng: Will");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await trigger(page).click();
    await expect(picker(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    await expect(picker(page).getByRole("radio")).toHaveText([/Will/, /Brian/, /Adam/, /Sarah/, /Jessica/]);
    await expect(radio(page, "Will")).toHaveAttribute("aria-checked", "true");
    await expect(radio(page, "Brian")).toHaveAttribute("aria-checked", "false");
    await expect(picker(page)).toContainText("giọng AI tạo sẵn · chữ bôi đen và từ tra vẫn dùng giọng của máy");
    await page.keyboard.press("Escape");
    await expect(picker(page)).toBeHidden();
    await page.keyboard.press("v");
    await expect(picker(page)).toBeVisible();
    await page.keyboard.press("v");
    await expect(picker(page)).toBeHidden();
  });

  test("TC9 chọn Sarah → nút đổi, 'đọc to' phát file Sarah, tải lại vẫn Sarah", async ({ page }) => {
    await page.goto(URL1);
    await trigger(page).click();
    await radio(page, "Sarah").click();
    await expect(radio(page, "Sarah")).toHaveAttribute("aria-checked", "true");
    await expect(picker(page)).toBeVisible(); // chọn xong ô vẫn mở để so tiếp
    await expect(trigger(page)).toContainText("giọng: Sarah");
    await page.keyboard.press("Escape");
    await readAloud(page).click();
    expect(await played(page)).toContain(audioPath("sarah", caption));
    await page.reload();
    await expect(trigger(page)).toContainText("giọng: Sarah");
  });

  test("TC10 'nghe thử Brian' phát câu mẫu của Brian, giọng đang chọn không đổi", async ({ page }) => {
    await page.goto(URL1);
    await trigger(page).click();
    const tryBrian = picker(page).getByRole("button", { name: "nghe thử Brian" });
    await expect(tryBrian).toContainText("▶ thử");
    await tryBrian.click();
    expect(await played(page)).toEqual([audioPath("brian", VOICES[1].sample)]);
    await expect(tryBrian).toContainText("■ dừng");
    await expect(radio(page, "Will")).toHaveAttribute("aria-checked", "true");
    await expect(trigger(page)).toContainText("giọng: Will");
    await tryBrian.click();
    await expect(tryBrian).toContainText("▶ thử");
  });

  test("TC11 đang đọc to mà đổi giọng → dừng, footer về 'đọc to'", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    await trigger(page).click();
    await radio(page, "Adam").click();
    expect(await pausedCount(page)).toBeGreaterThanOrEqual(1);
    await expect(readAloud(page)).toContainText("đọc to");
  });

  test("TC12 bấm ra ngoài thì đóng; Esc thì đóng và focus về nút mở", async ({ page }) => {
    await page.goto(URL1);
    await trigger(page).click();
    await expect(picker(page)).toBeVisible();
    await page.mouse.click(300, 500);
    await expect(picker(page)).toBeHidden();
    await trigger(page).click();
    await expect(picker(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(picker(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test("TC14 tie:voice lạ → Will", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("tie:voice", "bob"));
    await page.goto(URL1);
    await expect(trigger(page)).toContainText("giọng: Will");
  });

  test("mũi tên trong nhóm giọng: mỗi bước đổi giọng + dừng phát, không tự phát câu nghe thử", async ({ page }) => {
    await page.goto(URL1);
    await readAloud(page).click();
    await expect(readAloud(page)).toContainText("■ dừng");
    await page.keyboard.press("v");
    await expect(radio(page, "Will")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(radio(page, "Brian")).toBeFocused();
    await expect(radio(page, "Brian")).toHaveAttribute("aria-checked", "true");
    await expect(trigger(page)).toContainText("giọng: Brian");
    await expect(readAloud(page)).toContainText("đọc to");
    // giữ phím: nhiều bước liền nhau
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
    await expect(radio(page, "Jessica")).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("ArrowUp");
    await expect(radio(page, "Sarah")).toBeFocused();
    await expect(radio(page, "Sarah")).toHaveAttribute("aria-checked", "true");
    // chỉ có lần đọc to lúc đầu, không có câu nghe thử nào
    expect(await played(page)).toEqual([captionSrc]);
    // chỉ dòng đang chọn nằm trong thứ tự Tab (roving tabindex)
    await expect(picker(page).locator('[role="radio"][tabindex="0"]')).toHaveCount(1);
  });

  test("←/→ cũng đổi giọng như ↓/↑", async ({ page }) => {
    await page.goto(URL1);
    await page.keyboard.press("v");
    await expect(radio(page, "Will")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(radio(page, "Brian")).toBeFocused();
    await expect(radio(page, "Brian")).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(radio(page, "Will")).toHaveAttribute("aria-checked", "true");
  });

  test("dòng giọng có focus bàn phím thì viền bao cả dòng (gồm nút thử)", async ({ page }) => {
    await page.goto(URL1);
    await page.keyboard.press("v");
    const will = radio(page, "Will");
    await expect(will).toBeFocused();
    const row = will.locator("xpath=..");
    expect(await row.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
    // nút chọn không vẽ viền riêng (Tailwind outline-none = viền trong suốt)
    expect(await will.evaluate((el) => getComputedStyle(el).outlineColor)).toBe("rgba(0, 0, 0, 0)");
    // dùng chuột (mở ô + bấm dòng bằng chuột) thì không có viền
    await page.reload(); // trang mới: chưa có thao tác bàn phím nào
    await trigger(page).click();
    await radio(page, "Adam").click();
    await expect(radio(page, "Adam")).toBeFocused(); // bấm là focus nút (Safari không tự làm)
    expect(await radio(page, "Adam").locator("xpath=..").evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
  });

  test("đóng ô lúc câu nghe thử đang phát → câu thử dừng", async ({ page }) => {
    await page.goto(URL1);
    await trigger(page).click();
    await picker(page).getByRole("button", { name: "nghe thử Brian" }).click();
    const before = await pausedCount(page);
    await page.keyboard.press("Escape");
    await expect(picker(page)).toBeHidden();
    expect(await pausedCount(page)).toBeGreaterThan(before);
  });

  test("chọn giọng khác lúc câu nghe thử đang phát → câu thử dừng", async ({ page }) => {
    await page.goto(URL1);
    await trigger(page).click();
    const tryBrian = picker(page).getByRole("button", { name: "nghe thử Brian" });
    await tryBrian.click();
    await expect(tryBrian).toContainText("dừng");
    await radio(page, "Adam").click();
    await expect(tryBrian).toContainText("thử");
  });

  test("nút ✕ đóng ô", async ({ page }) => {
    await page.goto(URL1);
    await trigger(page).click();
    await picker(page).getByRole("button", { name: "đóng" }).click();
    await expect(picker(page)).toBeHidden();
  });

  test("Shift+Tab ra khỏi ô (desktop) → ô đóng, focus ở chỗ vừa tới", async ({ page }) => {
    await page.goto(URL1);
    await page.keyboard.press("v");
    await picker(page).getByRole("button", { name: "đóng" }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(picker(page)).toBeHidden();
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  });

  test("đã lưu Sarah: tải trang không có lỗi hydration, nút hiện Sarah", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("tie:voice", "sarah"));
    await page.goto(URL1);
    await expect(trigger(page)).toContainText("giọng: Sarah"); // chỉ hiện Sarah sau khi hydrate xong
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
  });
});
