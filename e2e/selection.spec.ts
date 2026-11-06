import { test, expect, type Page } from "@playwright/test";
import { P, charBoxes, finishTyping, installSpies, selectText, type Spy } from "./selection-helpers";
import { markCardsSeen } from "./card-helpers";

// Tiêu chí nghiệm thu 10–12 + RF5 — spec docs/superpowers/specs/2026-11-05-touch-selection-design.md.
// Desktop 1440×900, chuột.

const popup = (page: Page) => page.getByTestId("selection-popup");

/** Nhấn chuột ở đầu ký tự đầu của `needle`, kéo tới cuối ký tự cuối (chưa thả). */
async function dragOver(page: Page, needle: string) {
  const { first, last } = await charBoxes(page, needle);
  await page.mouse.move(first.left + 1, (first.top + first.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move(last.right - 1, (last.top + last.bottom) / 2, { steps: 8 });
}

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page); // không kiểm luồng vẽ trước: mở thẻ là hiện đủ
  await installSpies(page);
});

// Phía của popup: trên vùng chọn nếu ở đó đủ chỗ cho thẻ tra nghĩa (hoặc rộng hơn phía dưới), không thì dưới
// — spec docs/superpowers/specs/2026-11-05-in-app-lookup-design.md (thẻ mở ra không làm hàng nút nhảy chỗ).
test("Khi kéo chuột bôi đen thì lúc đang kéo chưa hiện popup; thả ra thì popup hiện cạnh vùng chọn (dòng đầu: phía dưới)", async ({ page }) => {
  // Thẻ vẽ trước: mô tả nằm dưới hình. Hạ chiều cao màn để cuộn được dòng đầu của mô tả lên sát header
  // (phía trên hết chỗ) — đúng tình huống "dòng đầu" mà test này kiểm.
  await page.setViewportSize({ width: 1440, height: 520 });
  await page.goto(P(1));
  await finishTyping(page, "click");
  await page.getByTestId("caption-text").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 60));
  await dragOver(page, "bets his rent money on horse");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("bets his rent money on horse");
  await expect(popup(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /tra nghĩa/ })).toBeVisible();
  const sel = await page.evaluate(() => window.getSelection()!.getRangeAt(0).getBoundingClientRect().bottom);
  const b = (await popup(page).boundingBox())!;
  expect(b.y, "đỉnh popup ở dưới vùng chọn").toBeGreaterThanOrEqual(sel);
});

test("Khi bôi đen chữ ở dòng dưới (phía trên đủ chỗ cho thẻ) thì popup hiện phía trên vùng chọn", async ({ page }) => {
  // Đoạn ngắn nên dòng cuối còn cao: hạ chiều cao màn để phía dưới chữ hẹp hơn phía trên, thẻ tra nghĩa mới ưu tiên ở trên.
  await page.setViewportSize({ width: 1440, height: 660 });
  await page.goto(P(1));
  await finishTyping(page, "click");
  // Thẻ vẽ trước: mô tả nằm dưới hình → cuộn để dòng cuối của mô tả nằm thấp trên màn (trên footer ~120px)
  await page
    .getByTestId("caption-text")
    .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY - (window.innerHeight - 120)));
  await dragOver(page, "anyone else");
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  const sel = await page.evaluate(() => window.getSelection()!.getRangeAt(0).getBoundingClientRect().top);
  const b = (await popup(page).boundingBox())!;
  expect(b.y + b.height, "đáy popup ở trên vùng chọn").toBeLessThanOrEqual(sel);
});

test.describe("1024×800", () => {
  test.use({ viewport: { width: 1024, height: 800 } });

  test("Khi bôi đen chữ sát mép trái cột thì popup nằm trọn trong màn hình", async ({ page }) => {
    await page.goto(P(1));
    await finishTyping(page, "click");
    await dragOver(page, "Charles");
    await page.mouse.up();
    await expect(popup(page)).toBeVisible();
    const b = (await popup(page).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(1024);
  });
});

test('Khi bôi đen 11 từ trở lên thì popup chỉ có "nghe"', async ({ page }) => {
  await page.goto(P(1));
  await finishTyping(page, "click");
  await dragOver(page, "This is Charles Bukowski, and his life is a mess. He");
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /nghe/ })).toBeVisible();
  await expect(popup(page).getByRole("button", { name: /tra nghĩa/ })).toHaveCount(0);
});

test("Khi đổi cỡ từ 1280px xuống 390px lúc đang chọn thì popup nhường chỗ cho thanh, không lúc nào có cả hai", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(P(1));
  await finishTyping(page, "click");
  await page.evaluate(() => {
    const w = window as unknown as { __both: boolean };
    w.__both = false;
    const check = () => {
      if (document.querySelector('[data-testid="selection-popup"]') && document.querySelector('[data-testid="selection-dock"]'))
        w.__both = true;
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
  });
  await selectText(page, "caption-text", "bets his rent money on horse");
  await expect(popup(page)).toBeVisible();
  await expect(page.getByTestId("selection-dock")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("selection-dock")).toBeVisible();
  await expect(popup(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __both: boolean }).__both)).toBe(false);
});

test('Khi chọn "bets his rent money on" rồi Shift+→ nới tới "bets his rent money on horse" thì vẫn ở đoạn 1, popup còn và giữ chữ mới', async ({ page }) => {
  await page.goto(P(1));
  await finishTyping(page, "click");
  await dragOver(page, "bets his rent money on");
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  for (let i = 0; i < " horse".length; i++) await page.keyboard.press("Shift+ArrowRight");
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("bets his rent money on horse");
  await page.waitForTimeout(400); // > 250ms chờ ổn định
  await expect(page).toHaveURL(new RegExp(`${P(1)}$`));
  await expect(popup(page)).toBeVisible();
  // Popup chỉ có nút, không in chữ: "nghe" đọc đúng chữ popup đang giữ.
  await popup(page).getByRole("button", { name: /nghe/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Spy).__spoken))
    .toEqual(["bets his rent money on horse"]);
  await expect(popup(page)).toBeVisible();
});

test("Khi popup đang hiện mà nhấn Escape thì popup tắt, vùng chọn bị bỏ", async ({ page }) => {
  await page.goto(P(1));
  await finishTyping(page, "click");
  await dragOver(page, "bets his rent money on horse");
  await page.mouse.up();
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popup(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("");
});

test("Khi ở chế độ giải thích mà kéo chuột bôi đen trong một cụm thì tấm giải thích mở, vùng chọn bị bỏ; đóng tấm thì không hiện popup cũ", async ({ page }) => {
  await page.goto(P(1));
  await finishTyping(page, "click");
  await page.keyboard.press("e");
  // Kéo qua vài chữ cái đầu của cụm đầu: thả chuột trong cụm → click rơi vào cụm → mở tấm.
  const word = (await page.locator("[data-chunk-id]").first().textContent())!.trim().slice(0, 4);
  await dragOver(page, word);
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(400); // > 250ms chờ ổn định
  await expect(popup(page)).toHaveCount(0);
});
