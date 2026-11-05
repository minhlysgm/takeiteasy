import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import type { Chunk } from "@/content/types";
import { books, getPassages } from "@/lib/content";

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
const view = (i: number) => (
  <PassageView book={book} chapterId="ch01" passage={passages[i - 1]} passageIndex={i} passageCount={passages.length} />
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

  it("đang có popup chọn chữ: đổi đoạn (back/forward) thì đoạn mới không vẽ popup lần nào", () => {
    const { rerender } = render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    const text = [...document.querySelectorAll('[data-testid="original-text"]')][0].firstChild as Text;
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
