import { test, expect, type Page } from "@playwright/test";
import { audioPath } from "@/lib/audio/audioPath";
import { VOICES } from "@/lib/audio/voices";
import { stubAudio } from "./audio-helpers";
import { markCardsSeen } from "./card-helpers";

// Các sửa nhỏ sau khi soi UI ở ⑥ task giọng AI (desktop 1440).
const URL1 = "/read/the-subtle-art/ch01/1";
const readAloud = (page: Page) => page.getByRole("button", { name: /^(s )?(đọc to|dừng)$/ });
const width = async (page: Page, sel: ReturnType<Page["getByRole"]>) => (await sel.boundingBox())!.width;

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
});

for (const voice of ["will", "jessica"]) {
  test(`tiêu đề header desktop nằm giữa màn (giọng ${voice})`, async ({ page }) => {
    await page.addInitScript((v) => localStorage.setItem("tie:voice", v), voice);
    await page.goto(URL1);
    const box = (await page.locator("header span.lg\\:inline").boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThanOrEqual(4);
  });
}

test.describe("đang phát", () => {
  test.beforeEach(async ({ page }) => {
    await stubAudio(page);
    await page.goto(URL1);
  });

  test("nút 'đọc to' ↔ '■ dừng' giữ nguyên bề rộng; ■ không vào tên nút", async ({ page }) => {
    const before = await width(page, readAloud(page));
    await readAloud(page).click();
    await expect(readAloud(page)).toHaveAccessibleName(/^(s )?dừng$/);
    expect(Math.abs((await width(page, readAloud(page))) - before)).toBeLessThan(0.5); // chỉ cho lệch làm tròn điểm ảnh
  });

  test("ô chọn giọng: '▶ thử' ↔ '■ dừng' giữ nguyên bề rộng, màu accent-strong; mô tả giọng đang chọn dùng màu text", async ({ page }) => {
    await page.getByTestId("voice-trigger").click();
    const picker = page.getByTestId("voice-picker");
    const tryWill = picker.getByRole("button", { name: "nghe thử Will" });
    await expect(tryWill).toHaveText("▶ thử");
    const before = await width(page, tryWill);
    const accent = await tryWill.evaluate((el) => getComputedStyle(el).color);
    await tryWill.click();
    await expect(tryWill).toHaveText("■ dừng"); // có khoảng trắng giữa ký tự và chữ
    expect(Math.abs((await width(page, tryWill)) - before)).toBeLessThan(0.5);
    await page.mouse.move(0, 0); // bỏ hover (hover = text-bright)
    await expect.poll(() => tryWill.evaluate((el) => getComputedStyle(el).color)).toBe(accent);

    const colors = await picker.getByRole("radio", { name: /Will/ }).evaluate((radio) => {
      const desc = radio.querySelector("span.block")!;
      const probe = document.createElement("span");
      probe.style.color = "var(--text)";
      document.body.append(probe);
      const text = getComputedStyle(probe).color;
      probe.remove();
      return { desc: getComputedStyle(desc).color, text };
    });
    expect(colors.desc).toBe(colors.text);
  });
});

test("nút ▶ câu ví dụ trong drawer desktop có vùng bấm ≥ 24px", async ({ page }) => {
  await page.goto(URL1);
  await page.getByRole("button", { name: /giải thích/ }).click();
  await page.getByTestId("reader").locator("button.font-hand").first().click();
  const play = page.getByRole("dialog", { name: "be a mess" }).getByRole("button", { name: /^nghe:/ }).first();
  const box = (await play.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
});

test("file audio được cache lâu dài (tên file theo nội dung)", async ({ request }) => {
  const res = await request.get(audioPath("will", VOICES[0].sample));
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("immutable");
});
