import { test, expect, type Page } from "@playwright/test";

const BOOK = "the-subtle-art";
const CH = "ch01";

/** Bỏ qua hiệu ứng gõ chữ của bản dịch (click vào cột dịch = skip). */
async function finishTyping(page: Page) {
  await page.getByTestId("translation-col").click();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

test.describe("kệ sách → đọc", () => {
  test("mở chương từ kệ sách và vào đoạn 1", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The Subtle Art");
    await page.getByRole("link", { name: /Don't Try/ }).click();
    await expect(page).toHaveURL(new RegExp(`/read/${BOOK}/${CH}/1$`));
    await expect(page.getByTestId("caption-col")).toContainText("Charles Bukowski");
  });

  test("số đoạn không hợp lệ được chuyển về đoạn 1", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/0`);
    await expect(page).toHaveURL(new RegExp(`/read/${BOOK}/${CH}/1$`));
  });
});

test.describe("bố cục desktop", () => {
  test("nguyên văn và bản dịch nằm cạnh nhau ở 1440px", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/1`);
    await expect(page.getByTestId("caption-col")).toBeVisible();
    const o = await page.getByTestId("caption-col").boundingBox();
    const t = await page.getByTestId("translation-col").boundingBox();
    expect(o && t).toBeTruthy();
    expect(t!.x).toBeGreaterThanOrEqual(o!.x + o!.width);
  });
});

test.describe("điều hướng đoạn", () => {
  test("Enter sang đoạn tiếp, nút ← trước quay lại", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/1`);
    await finishTyping(page);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
    await page.getByRole("button", { name: "← trước" }).click();
    await expect(page).toHaveURL(new RegExp(`/${CH}/1$`));
  });

  test("kệ sách hiện nút đọc tiếp sau khi đã đọc", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/2`);
    await expect(page.getByTestId("caption-col")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("link", { name: /đọc tiếp/ })).toHaveAttribute("href", `/read/${BOOK}/${CH}/2`);
  });
});

test.describe("chế độ giải thích", () => {
  test("bật giải thích → bấm ghi chú → mở drawer → Esc đóng", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/1`);
    await finishTyping(page);
    await page.getByRole("button", { name: /giải thích/ }).click();
    await expect(page.locator("header")).toContainText("explain");

    const note = page.getByTestId("reader").locator("button.font-hand").first();
    await expect(note).toBeVisible();
    await note.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("mẹo lần đầu", () => {
  test("bấm 'đã hiểu' thì mẹo không hiện lại sau khi tải lại", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/1`);
    const ok = page.getByRole("button", { name: "đã hiểu" });
    await expect(ok).toBeVisible();
    await ok.click();
    await expect(ok).toBeHidden();
    await page.reload();
    await expect(page.getByTestId("caption-col")).toBeVisible();
    await expect(page.getByRole("button", { name: "đã hiểu" })).toBeHidden();
  });
});
