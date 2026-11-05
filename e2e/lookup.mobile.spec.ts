import { test, expect, type Page } from "@playwright/test";
import { LOUT, mockLookup } from "./lookup-helpers";
import { P, dismissFirstTimeHint, finishTyping, installSpies, selectText } from "./selection-helpers";

// Tiêu chí nghiệm thu 7 — spec docs/superpowers/specs/2026-11-05-in-app-lookup-design.md.
// Pixel 7 (390×844, cảm ứng). Vùng chọn tạo bằng script; /api/lookup luôn bị giả.

const dock = (page: Page) => page.getByTestId("selection-dock");

async function openCard(page: Page) {
  await mockLookup(page, { status: "ok", result: LOUT });
  await installSpies(page);
  await dismissFirstTimeHint(page);
  await page.goto(P(1));
  await finishTyping(page, "tap");
  await selectText(page, "original-text", "lout");
  await expect(dock(page)).toBeVisible();
  await dock(page).getByRole("button", { name: "tra nghĩa" }).tap();
  await expect(dock(page).getByTestId("lookup-card")).toContainText("kẻ thô lỗ");
}

test("Khi chạm \"tra nghĩa\" thì thẻ nằm trong thanh đáy, ngay trên footer, có nút đóng thẻ", async ({ page }) => {
  await openCard(page);
  await expect(dock(page).getByRole("button", { name: "đóng thẻ" })).toBeVisible();
  const c = (await dock(page).getByTestId("lookup-card").boundingBox())!;
  const f = (await page.locator("footer").boundingBox())!;
  expect(c.y + c.height, "đáy thẻ ≤ đỉnh footer").toBeLessThanOrEqual(f.y + 1);
});

test("Khi chạm đóng thẻ thì thẻ ẩn", async ({ page }) => {
  await openCard(page);
  await dock(page).getByRole("button", { name: "đóng thẻ" }).tap();
  await expect(page.getByTestId("lookup-card")).toHaveCount(0);
});

test("Khi chạm \"tra nghĩa\" lần nữa lúc thẻ đang mở thì thẻ đóng, thanh vẫn còn; ✕ nằm cùng hàng nút", async ({ page }) => {
  await openCard(page);
  const bar = dock(page).getByRole("toolbar", { name: "chữ đang chọn" });
  await expect(bar.getByRole("button", { name: "đóng thẻ" })).toBeVisible();
  const btn = bar.getByRole("button", { name: "tra nghĩa" });
  await btn.tap();
  await expect(page.getByTestId("lookup-card")).toHaveCount(0);
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(dock(page)).toBeVisible();
});

test.describe("390×560 (màn thấp)", () => {
  test.use({ viewport: { width: 390, height: 560 } });

  test("Khi thẻ dài hơn chỗ trống thì có vệt mờ báo còn chữ; cuộn tới cuối thì vệt mờ ẩn", async ({ page }) => {
    await mockLookup(page, {
      status: "ok",
      result: {
        ...LOUT,
        meaning: "kẻ thô lỗ, cục cằn, cư xử khó coi; người ồn ào, chen ngang, không biết nói cảm ơn hay xin lỗi",
        example: {
          en: "My cousin acted like a lout at the wedding: he talked loudly during the vows and never thanked the hosts.",
          vi: "Ông anh họ tui cư xử như kẻ thô lỗ ở đám cưới: nói to lúc đọc lời thề, chẳng cảm ơn chủ nhà câu nào.",
        },
      },
    });
    await installSpies(page);
    await dismissFirstTimeHint(page);
    await page.goto(P(1));
    await finishTyping(page, "tap");
    await selectText(page, "original-text", "lout");
    await dock(page).getByRole("button", { name: "tra nghĩa" }).tap();
    const c = dock(page).getByTestId("lookup-card");
    await expect(c).toContainText("đám cưới");
    const body = c.getByTestId("lookup-body");
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight), "thân thẻ phải cuộn").toBe(true);
    await expect(c.getByTestId("lookup-fade")).toBeVisible();
    await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(c.getByTestId("lookup-fade")).toHaveCount(0);
    // Dòng chân luôn hiện, một dòng
    const footer = (await c.getByTestId("lookup-footer").boundingBox())!;
    expect(footer.height).toBeLessThanOrEqual(46);
  });
});

test.describe("320×640", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("Khi ở 320px thì thanh không tràn ngang, nút nghe / tra nghĩa / đóng thẻ cao ≥ 44px", async ({ page }) => {
    await openCard(page);
    const d = dock(page);
    const { sw, cw } = await d.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sw, "scrollWidth thanh").toBeLessThanOrEqual(cw);
    for (const name of ["nghe", "tra nghĩa", "đóng thẻ"]) {
      const b = d.getByRole("button", { name, exact: true });
      expect((await b.boundingBox())!.height, name).toBeGreaterThanOrEqual(44);
    }
    expect((await d.getByRole("button", { name: "nghe: lout" }).boundingBox())!.height, "nghe: lout").toBeGreaterThanOrEqual(44);
    // Chân thẻ "AI soạn · Cambridge ↗" một dòng (ô link 44px + viền)
    expect((await d.getByTestId("lookup-footer").boundingBox())!.height, "chân thẻ một dòng").toBeLessThanOrEqual(46);
  });
});
