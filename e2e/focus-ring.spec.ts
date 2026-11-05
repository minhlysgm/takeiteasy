import { test, expect, type Page } from "@playwright/test";

// Viền focus chung: đi bằng Tab thì mọi nút/link có viền 2px màu --accent (không phải viền xanh mặc định),
// bấm chuột thì không hiện viền.

type Ring = { tag: string; label: string; style: string; width: string; color: string; accent: string };

async function focusedRing(page: Page): Promise<Ring | null> {
  return page.evaluate(async () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    // nút có transition-colors (gồm cả outline-color) → đợi chuyển màu xong mới đo
    await Promise.all(el.getAnimations().map((a) => a.finished));
    const probe = document.createElement("span");
    probe.style.color = "var(--accent)";
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      label: (el.textContent?.trim() || el.getAttribute("aria-label") || "").slice(0, 30),
      style: cs.outlineStyle,
      width: cs.outlineWidth,
      color: cs.outlineColor,
      accent,
    };
  });
}

async function openReaderExplain(page: Page) {
  await page.goto("/read/the-subtle-art/ch01/1");
  await page.getByTestId("translation-col").click(); // bỏ hiệu ứng gõ chữ
  await page.getByRole("button", { name: /giải thích/ }).click();
  await expect(page.locator("header")).toContainText("explain");
}

async function tabThrough(page: Page, steps: number) {
  const seen: Ring[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Tab");
    const r = await focusedRing(page);
    if (r && r.tag !== "NEXTJS-PORTAL") seen.push(r);
  }
  return seen;
}

function expectAccentRing(rings: Ring[]) {
  expect(rings.length, "Tab phải tới được ít nhất 1 nút/link").toBeGreaterThan(0);
  for (const r of rings) {
    expect({ label: r.label, style: r.style, width: r.width, color: r.color }, `viền focus của "${r.label}"`).toEqual({
      label: r.label,
      style: "solid",
      width: "2px",
      color: r.accent,
    });
  }
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`theme ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("tie:theme", t), theme);
    });

    test("Khi đi bằng Tab ở màn đọc (bật giải thích) thì mọi nút có viền 2px màu accent", async ({ page }) => {
      await openReaderExplain(page);
      expectAccentRing(await tabThrough(page, 12));
    });

    test("Khi đi bằng Tab ở kệ sách thì mọi nút/link có viền 2px màu accent", async ({ page }) => {
      await page.goto("/");
      expectAccentRing(await tabThrough(page, 6));
    });

    test("Khi mở tấm giải thích rồi Tab trong tấm thì nút trong tấm có viền accent", async ({ page }) => {
      await openReaderExplain(page);
      await page.getByTestId("reader").locator("button.font-hand").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expectAccentRing(await tabThrough(page, 4));
    });
  });
}

test("Khi bấm chuột vào nút thì không hiện viền focus", async ({ page }) => {
  await page.goto("/");
  const btn = page.locator("button").first();
  await btn.click();
  await expect(btn).toBeFocused();
  expect((await focusedRing(page))?.style).toBe("none");
});
