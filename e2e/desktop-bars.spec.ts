import { test, expect, type Page } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// Không kiểm luồng vẽ trước: coi như đã xem hình, mở thẻ là mô tả + bản dịch hiện đủ.
test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
});

// Desktop: header + footer dính mép màn hình; ngăn giải thích nằm giữa hai thanh.
const SIZES = [[1440, 900], [1280, 800]] as const;
const url = (n: number) => `/read/the-subtle-art/ch01/${n}`;

async function finishTyping(page: Page) {
  await page.getByTestId("translation-col").click();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}
const scrollTo = (page: Page, where: "top" | "bottom") =>
  page.evaluate((w) => window.scrollTo(0, w === "top" ? 0 : document.documentElement.scrollHeight), where);

/** Trả về tên các nút trong vùng chọn mà điểm giữa nút không bấm trúng chính nó (bị che / ngoài màn hình). */
const unclickable = (page: Page, scope: string) =>
  page.evaluate((scope) => {
    return [...document.querySelectorAll<HTMLElement>(`${scope} button`)]
      .filter((b) => b.offsetParent !== null)
      .filter((b) => {
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return true;
        const hit = document.elementFromPoint(x, y);
        return !hit || !b.contains(hit);
      })
      .map((b) => b.textContent?.trim());
  }, scope);

for (const [w, h] of SIZES) {
  test.describe(`${w}×${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    for (const n of [1, 2, 3]) {
      test(`đoạn ${n}: header và footer luôn thấy, đầu trang lẫn cuối trang`, async ({ page }) => {
        await page.goto(url(n));
        await finishTyping(page);
        for (const where of ["top", "bottom"] as const) {
          await scrollTo(page, where);
          const header = (await page.locator("header").boundingBox())!;
          const footer = (await page.locator("footer").boundingBox())!;
          expect(header.y, `${where}: header`).toBeGreaterThanOrEqual(0);
          expect(footer.y + footer.height, `${where}: footer`).toBeLessThanOrEqual(h + 0.5);
          expect(await unclickable(page, "footer"), `${where}: nút footer`).toEqual([]);
        }
      });
    }

    test("đoạn 3 cuộn hết: ý chính không bị footer che", async ({ page }) => {
      await page.goto(url(3));
      await finishTyping(page);
      await scrollTo(page, "bottom");
      const last = (await page.getByTestId("translation-col").boundingBox())!;
      const footer = (await page.locator("footer").boundingBox())!;
      expect(last.y + last.height).toBeLessThanOrEqual(footer.y + 0.5);
    });

    test("đoạn 3 mở giải thích: ngăn nằm giữa header và footer, nút chuyển cụm và footer bấm được", async ({ page }) => {
      await page.goto(url(3));
      await finishTyping(page);
      await page.keyboard.press("e");
      await page.locator("button.font-hand:visible").first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(400); // chờ trượt vào xong
      for (const where of ["top", "bottom"] as const) {
        await scrollTo(page, where);
        const d = (await dialog.boundingBox())!;
        const header = (await page.locator("header").boundingBox())!;
        const footer = (await page.locator("footer").boundingBox())!;
        expect(d.y, `${where}: đỉnh ngăn`).toBeGreaterThanOrEqual(header.y + header.height - 0.5);
        expect(d.y + d.height, `${where}: đáy ngăn`).toBeLessThanOrEqual(footer.y + 0.5);
        expect(await unclickable(page, '[role="dialog"]'), `${where}: nút trong ngăn`).toEqual(
          // nút chunk trước bị tắt ở cụm 1 vẫn phải nằm trong màn hình → không lọc ra; disabled vẫn trúng chính nó
          [],
        );
        expect(await unclickable(page, "footer"), `${where}: nút footer`).toEqual([]);
      }
    });
  });
}
