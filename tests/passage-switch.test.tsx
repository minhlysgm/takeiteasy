import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import type { Chunk } from "@/content/types";
import { books, firstSentence, getPassages } from "@/lib/content";
import { sketchSeenKey } from "@/lib/sketchSeen";

// PassageView sống xuyên các đoạn (layout của chương): state của đoạn cũ không được lọt sang
// lần vẽ ĐẦU TIÊN của đoạn mới, kể cả một khung hình. Các con được thay bằng bản ghi lại props.

const log: string[] = [];
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/components/reader/ChunkDrawer", () => ({
  ChunkDrawer: ({ chunks, index }: { chunks: Chunk[]; index: number }) => {
    log.push(`drawer:${chunks[index]?.id ?? "undefined"}`);
    return <div role="dialog" />;
  },
}));
vi.mock("@/components/reader/AnnotationLayer", () => ({
  AnnotationLayer: ({ chunks }: { chunks: Chunk[] }) => {
    log.push(`notes:${chunks[0].id}`);
    return null;
  },
}));
vi.mock("@/components/reader/SelectionPopup", () => ({
  SelectionPopup: ({ selection }: { selection: { text: string } }) => {
    log.push(`popup:${selection.text}`);
    return null;
  },
}));

const book = books[0];
const passages = getPassages(book.id, "ch01")!;
const outline = passages.map((p, i) => ({ index: i + 1, firstSentence: firstSentence(p.caption) }));
const view = (i: number) => (
  <PassageView outline={outline} chapterTitle="Chương 1 · Don't Try" book={book} chapterId="ch01" passage={passages[i - 1]} passageIndex={i} passageCount={passages.length} />
);

describe("PassageView — chuyển đoạn không remount", () => {
  const original = Range.prototype.getBoundingClientRect;
  beforeAll(() => {
    Range.prototype.getBoundingClientRect = () =>
      ({ left: 40, top: 200, width: 120, height: 20, right: 160, bottom: 220, x: 40, y: 200, toJSON() {} }) as DOMRect;
  });
  afterAll(() => {
    Range.prototype.getBoundingClientRect = original;
  });
  beforeEach(() => {
    localStorage.clear();
    log.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.useRealTimers();
  });

  it("tấm giải thích đang mở + chế độ giải thích: đoạn mới không vẽ lần nào với tấm/ghi chú của đoạn cũ", () => {
    const { rerender } = render(view(1));
    fireEvent.keyDown(window, { key: "x" }); // bỏ qua hiệu ứng gõ
    fireEvent.keyDown(window, { key: "e" });
    const spans = document.querySelectorAll("[data-chunk-id]");
    fireEvent.click(spans[spans.length - 1]);
    expect(log.some((l) => l.startsWith("drawer:"))).toBe(true);
    log.length = 0;
    rerender(view(2));
    expect(log).toEqual([]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("banner").textContent).not.toContain("explain");
  });

  it("chuyển sang thẻ đã xem: lần vẽ đầu đã hiện đủ, không loé chỗ chờ (back/forward giữ được chỗ cuộn)", () => {
    localStorage.setItem(sketchSeenKey("ch01-p02"), "1");
    const { rerender, container } = render(view(1));
    fireEvent.keyDown(window, { key: "x" }); // thẻ 1: hiện đủ
    const mo = new MutationObserver(() => {});
    mo.observe(container, { childList: true, subtree: true });
    rerender(view(2));
    // Chỗ chờ mà loé một khung thì đã bị gỡ ra khỏi DOM ngay sau đó: soi cả nút thêm vào lẫn nút bị gỡ
    const waiting = '[data-testid="caption-waiting"],[data-testid="translation-waiting"]';
    const flashed = mo
      .takeRecords()
      .flatMap((r) => [...r.addedNodes, ...r.removedNodes])
      .filter((n) => n instanceof Element && (n.matches(waiting) || n.querySelector(waiting)));
    mo.disconnect();
    expect(flashed).toEqual([]);
    expect(screen.queryByTestId("caption-waiting")).toBeNull();
    expect(screen.getByTestId("credit")).toBeTruthy();
  });

  it("chuyển sang thẻ chưa xem: bắt đầu lại ở chỗ chờ, không mang chữ đã gõ của thẻ cũ", () => {
    const { rerender } = render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    rerender(view(2));
    expect(screen.getByTestId("caption-waiting").textContent).toBe("đang vẽ…");
    expect(screen.getByTestId("translation-waiting")).toBeTruthy();
    expect(screen.getByTestId("translation-col").textContent).not.toContain(passages[0].translation.slice(0, 20));
    expect(screen.queryByTestId("credit")).toBeNull();
  });

  it("đang có popup chọn chữ: đổi đoạn (back/forward) thì đoạn mới không vẽ popup lần nào", () => {
    const { rerender } = render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    const text = [...document.querySelectorAll('[data-testid="caption-text"]')][0].firstChild as Text;
    act(() => {
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 7);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => void vi.advanceTimersByTime(300));
    expect(log.some((l) => l.startsWith("popup:"))).toBe(true);
    log.length = 0;
    rerender(view(2));
    expect(log).toEqual([]);
  });
});
