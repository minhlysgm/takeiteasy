import { test, expect, type Page } from "@playwright/test";
import { getPassage } from "@/lib/content";
import { SKETCH_START_DELAY_MS } from "@/lib/sketch/timeline";

const BOOK = "the-subtle-art";
const CH = "ch01";
const P1 = `/read/${BOOK}/${CH}/1`;
const PASSAGE_2 = getPassage(BOOK, CH, 2)!;

/** Bỏ qua hiệu ứng gõ chữ của bản dịch (click vào cột dịch = skip). */
async function finishTyping(page: Page) {
  await page.getByTestId("translation-col").click();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

// Mỗi test dùng context mới của Playwright nên localStorage `tie:sketch-seen:*` không rò giữa các test.
test.describe("phác thảo đoạn 1", () => {
  test("1. chờ bản dịch gõ xong thì mới vẽ", async ({ page }) => {
    await page.goto(P1);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", "waiting");
    await expect(sketch).toContainText("chờ bản dịch gõ xong…");
    await expect(page.getByText("đang gõ…")).toBeVisible();
  });

  test("2. gõ xong thì bút chì vẽ rồi dừng ở done", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    const sketch = page.getByTestId("sketch");
    await expect(page.getByTestId("sketch-pencil")).toBeVisible();
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 8000 });
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "↻ vẽ lại" })).toBeVisible();
  });

  test("3. bấm vào hình khi đang vẽ thì hiện hết ngay", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await page.getByRole("img", { name: /Charles Bukowski/ }).click();
    await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 500 });
  });

  test("4. nút ↻ vẽ lại vẽ lại từ đầu", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    const sketch = page.getByTestId("sketch");
    await page.getByRole("button", { name: "xem ngay ⏭" }).click();
    await expect(sketch).toHaveAttribute("data-state", "done");
    await page.getByRole("button", { name: "↻ vẽ lại" }).click();
    await expect(sketch).toHaveAttribute("data-state", "drawing");
  });

  test("5. quay lại đoạn đã xem thì hình hiện sẵn, không vẽ lại", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    await page.getByRole("button", { name: "xem ngay ⏭" }).click();
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
    await page.getByRole("button", { name: "← trước" }).click();
    await expect(page).toHaveURL(new RegExp(`/${CH}/1$`));
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
  });

  test("6. giảm chuyển động thì hình tĩnh, không bút chì, không nút vẽ lại", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(P1);
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "↻ vẽ lại" })).toHaveCount(0);
  });

  test.describe("7. Enter giữa lúc đang vẽ thì hiệu ứng cũ dừng, đoạn 2 theo luật của nó", () => {
    /** Vẽ dở đoạn 1 rồi Enter sang đoạn 2. Phải gõ xong trước: lúc đang gõ, Enter chỉ bỏ qua hiệu ứng gõ chứ không chuyển đoạn. */
    async function enterMidDraw(page: Page) {
      await page.goto(P1);
      await finishTyping(page);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
      // data-state nằm trên khung chung, nên chờ đúng hình đoạn 2 để không đọc nhầm trạng thái của hình cũ
      await expect(page.getByRole("img", { name: PASSAGE_2.sketch!.alt, exact: true })).toBeVisible();
    }

    test("đoạn 2 chưa xem: chờ bản dịch gõ xong rồi mới vẽ", async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (e) => errors.push(e));
      await enterMidDraw(page);
      const sketch = page.getByTestId("sketch");
      await expect(sketch).toHaveAttribute("data-state", "waiting");
      await expect(page.getByText("đang gõ…")).toBeVisible();
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
      // Chờ quá độ trễ bắt đầu vẽ: nếu đoạn 2 tưởng bản dịch đã gõ xong thì lúc này nó đã vẽ rồi.
      await page.waitForTimeout(SKETCH_START_DELAY_MS + 200);
      await expect(page.getByText("đang gõ…")).toBeVisible();
      await expect(sketch).toHaveAttribute("data-state", "waiting");
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
      await finishTyping(page);
      await expect(sketch).toHaveAttribute("data-state", "drawing");
      await expect(page.getByTestId("sketch-pencil")).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("đoạn 2 đã xem: hình hiện sẵn, không bút chì", async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (e) => errors.push(e));
      await page.addInitScript((id) => localStorage.setItem(`tie:sketch-seen:${id}`, "1"), PASSAGE_2.id);
      await enterMidDraw(page);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });

  test("8. bật giải thích thì hình mờ đi", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    await page.getByRole("button", { name: /giải thích/ }).click();
    await expect(page.getByTestId("sketch")).toHaveClass(/opacity-30/);
  });

  test("9. hình có mô tả cho trình đọc màn hình", async ({ page }) => {
    await page.goto(P1);
    await expect(page.getByRole("img", { name: /^Phác thảo: Charles Bukowski/ })).toBeVisible();
  });

  for (const n of [1, 2, 3]) {
    test(`10. nét vẽ SSR khớp client, không lỗi hydration (đoạn ${n})`, async ({ page }) => {
      const bad: string[] = [];
      page.on("console", (m) => m.type() === "error" && bad.push(m.text()));
      page.on("pageerror", (e) => bad.push(e.message));
      await page.goto(`/read/${BOOK}/${CH}/${n}`);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "waiting");
      expect(bad.filter((t) => /hydrat/i.test(t))).toEqual([]);
    });
  }
});
