import { test, expect, type Page } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// A4: vào thẳng / tải lại một thẻ. Server không đọc được localStorage nên HTML đầu tiên phải tự chọn đúng
// "chờ vẽ" hay "hiện đủ" ngay trước khi JS chạy (script đầu trang + CSS), và hydrate xong không nháy, không lệch.

const P1 = "/read/the-subtle-art/ch01/1";

test.use({ viewport: { width: 1440, height: 900 } });

/** Chặn JS của Next: trang dừng ở HTML server (script nội tuyến đầu trang vẫn chạy). */
async function blockHydration(page: Page) {
  await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
}

async function expectFullShown(page: Page) {
  await expect(page.getByTestId("caption-text")).toBeVisible();
  await expect(page.getByTestId("caption-waiting")).toBeHidden();
  await expect(page.getByTestId("translation-waiting")).toBeHidden();
  await expect(page.getByTestId("credit")).toBeVisible();
  await expect(page.getByTestId("sketch-art")).toHaveCSS("opacity", "1");
}

test.describe("trước khi hydrate (HTML server)", () => {
  test("thẻ đã xem: hiện đủ ngay, không có chỗ chờ vẽ", async ({ page }) => {
    await markCardsSeen(page, ["ch01-p01"]);
    await blockHydration(page);
    await page.goto(P1, { waitUntil: "domcontentloaded" });
    await expectFullShown(page);
  });

  test("giảm chuyển động: hiện đủ ngay", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await blockHydration(page);
    await page.goto(P1, { waitUntil: "domcontentloaded" });
    await expectFullShown(page);
  });

  test("thẻ chưa xem (kể cả có khoá cũ không version): chỗ chờ, mô tả + bản dịch ẩn, hình chưa hiện", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("tie:sketch-seen:ch01-p01", "1"));
    await markCardsSeen(page, ["ch01-p02"]);
    await blockHydration(page);
    await page.goto(P1, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("caption-waiting")).toBeVisible();
    await expect(page.getByTestId("translation-waiting")).toBeVisible();
    await expect(page.getByTestId("caption-text")).toBeHidden();
    await expect(page.getByTestId("credit")).toBeHidden();
    await expect(page.getByTestId("sketch-art")).toHaveCSS("opacity", "0");
  });
});

/** Ghi lại mỗi khung hình (rAF) sau khi React đã gắn vào trang: có lúc nào chỗ chờ vẽ hiện ra không. */
async function watchWaitingFrames(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __waitFrames: number };
    w.__waitFrames = 0;
    const tick = () => {
      const el = document.querySelector('[data-testid="caption-waiting"]') as HTMLElement | null;
      if (location.pathname.startsWith("/read/") && el && el.offsetParent !== null) w.__waitFrames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const waitFrames = (page: Page) => page.evaluate(() => (window as unknown as { __waitFrames: number }).__waitFrames);

test("tải lại thẻ đã xem: không khung hình nào hiện chỗ chờ, không lỗi hydrate", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await markCardsSeen(page, ["ch01-p01"]);
  await watchWaitingFrames(page);
  await page.goto(P1);
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("credit")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("credit")).toBeVisible();
  expect(await waitFrames(page)).toBe(0);
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});

test("từ kệ sách bấm vào chương (thẻ đã xem): không khung hình nào hiện chỗ chờ", async ({ page }) => {
  await markCardsSeen(page, ["ch01-p01"]);
  await watchWaitingFrames(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Don't Try/ }).click();
  await expect(page).toHaveURL(/\/ch01\/1$/);
  await expect(page.getByTestId("credit")).toBeVisible();
  expect(await waitFrames(page)).toBe(0);
});
