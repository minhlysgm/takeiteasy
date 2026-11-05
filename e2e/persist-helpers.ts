import type { Page } from "@playwright/test";

// Dùng chung cho e2e/passage-persist.spec.ts và .mobile.spec.ts.

/** Đánh dấu header/footer hiện tại và ghi lại transitionstart của vạch tiến độ `bar`. */
export async function markShell(page: Page, bar: string) {
  await page.evaluate((sel) => {
    const w = window as unknown as { __tr: string[] };
    w.__tr = [];
    (document.querySelector("header") as unknown as { __mark: number }).__mark = 1;
    (document.querySelector("footer") as unknown as { __mark: number }).__mark = 1;
    document.querySelector(sel)!.addEventListener("transitionstart", (e) => w.__tr.push((e as TransitionEvent).propertyName));
  }, bar);
}

/** Header/footer còn là phần tử cũ không, và vạch tiến độ đã chạy transition nào. */
export async function shellState(page: Page) {
  return page.evaluate(() => ({
    header: (document.querySelector("header") as unknown as { __mark?: number }).__mark === 1,
    footer: (document.querySelector("footer") as unknown as { __mark?: number }).__mark === 1,
    transitions: (window as unknown as { __tr?: string[] }).__tr ?? [],
  }));
}
