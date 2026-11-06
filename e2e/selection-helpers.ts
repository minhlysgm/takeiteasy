import { expect, type Page } from "@playwright/test";

// Dùng chung cho e2e/selection.spec.ts (desktop) và e2e/selection.mobile.spec.ts.

export const P = (n: number) => `/read/the-subtle-art/ch01/${n}`;

export type Spy = { __spoken: string[]; __opened: string[] };

/** Giả lập speechSynthesis.speak và window.open: ghi lại thay vì đọc / mở tab. */
export async function installSpies(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Spy;
    w.__spoken = [];
    w.__opened = [];
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        w.__spoken.push(u.text);
      };
    }
    window.open = (url?: string | URL) => {
      w.__opened.push(String(url));
      return null;
    };
  });
}

/** Đã bấm "đã hiểu" ở mẹo lần đầu (khoá của FirstTimeHint: `tie:hint:reader`). */
export async function dismissFirstTimeHint(page: Page) {
  await page.addInitScript(() => localStorage.setItem("tie:hint:reader", "1"));
}

/** Chờ hydrate xong (hình minh hoạ rời "idle"), rồi bỏ qua hiệu ứng gõ chữ của bản dịch. */
export async function finishTyping(page: Page, how: "tap" | "click") {
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  const col = page.getByTestId("translation-col");
  if (how === "tap") await col.tap();
  else await col.click();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

/**
 * Bôi đen chuỗi con `needle` (lần xuất hiện đầu) trong `[data-testid=testId]` bằng Range
 * — Playwright không giả lập được giữ-tay-để-bôi-đen. Trả về số ms tới khi `waitFor` (testid) xuất hiện,
 * hoặc -1 nếu không chờ / không thấy trong 2s.
 */
export async function selectText(page: Page, testId: string, needle: string, waitFor?: string) {
  return page.evaluate(
    async ([id, s, wait]) => {
      const root = document.querySelector(`[data-testid="${id}"]`);
      if (!root) throw new Error(`không thấy ${id}`);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: { node: Text; start: number }[] = [];
      let full = "";
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        nodes.push({ node, start: full.length });
        full += node.data;
      }
      const at = full.indexOf(s);
      if (at < 0) throw new Error(`không thấy "${s}" trong ${id}`);
      const locate = (i: number, isEnd: boolean) => {
        for (const n of nodes) {
          const end = n.start + n.node.data.length;
          if (isEnd ? i <= end : i < end) return { node: n.node, offset: i - n.start };
        }
        throw new Error("vượt quá nội dung");
      };
      const a = locate(at, false);
      const b = locate(at + s.length, true);
      const range = document.createRange();
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      if (!wait) return -1;
      const t0 = performance.now();
      while (performance.now() - t0 < 2000) {
        if (document.querySelector(`[data-testid="${wait}"]`)) return performance.now() - t0;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return -1;
    },
    [testId, needle, waitFor ?? ""] as const,
  );
}

/** Toạ độ viewport của ký tự đầu và ký tự cuối của `needle` trong nguyên văn (để kéo chuột). */
export async function charBoxes(page: Page, needle: string) {
  return page.evaluate((s) => {
    const root = document.querySelector('[data-testid="caption-text"]')!;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let full = "";
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      nodes.push({ node, start: full.length });
      full += node.data;
    }
    const at = full.indexOf(s);
    if (at < 0) throw new Error(`không thấy "${s}"`);
    const charRect = (i: number) => {
      const n = nodes.find((x) => i < x.start + x.node.data.length)!;
      const r = document.createRange();
      r.setStart(n.node, i - n.start);
      r.setEnd(n.node, i - n.start + 1);
      const b = r.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    };
    return { first: charRect(at), last: charRect(at + s.length - 1) };
  }, needle);
}
