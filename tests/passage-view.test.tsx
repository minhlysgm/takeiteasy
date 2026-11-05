import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import { books, getPassages } from "@/lib/content";
import { getProgress } from "@/lib/progress";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// nút "giải thích" mount AnnotationLayer → cần mock rough-notation (jsdom không vẽ SVG được)
vi.mock("rough-notation", () => ({
  annotate: () => ({ remove: () => {} }),
  annotationGroup: () => ({ show: () => {} }),
}));

const book = books[0];
const passages = getPassages(book.id, "ch01")!;

function renderView() {
  return render(
    <PassageView
      book={book}
      chapterId="ch01"
      passage={passages[0]}
      passageIndex={1}
      passageCount={passages.length}
    />,
  );
}

describe("PassageView", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it("render nguyên văn và header đoạn", () => {
    renderView();
    expect(screen.getByTestId("original-col").textContent).toContain("Charles Bukowski was an alcoholic");
    expect(screen.getByText(new RegExp(`đoạn 1/${passages.length}`))).toBeTruthy();
  });

  it("lưu tiến độ khi mở đoạn", () => {
    renderView();
    expect(getProgress()).toEqual({ bookId: book.id, chapterId: "ch01", passageIndex: 1 });
  });

  it("phím bất kỳ khi đang typing thì skip (hiện đủ bản dịch)", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    expect(screen.getByTestId("translation-col").textContent).toContain("điểm khởi đầu hoàn hảo");
  });

  it("không lùi được khi đang ở đoạn 1, enter đi tới đoạn 2", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(push).not.toHaveBeenCalled(); // đang ở đoạn 1, không lùi được
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("có 2 nút theme tìm được theo tên: header (mobile) và footer (desktop) — CSS ẩn một trong hai", () => {
    renderView();
    const buttons = screen.getAllByRole("button", { name: /theme/ });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].closest("header")).toBeTruthy();
    expect(buttons[1].closest("footer")).toBeTruthy();
  });

  it("nút '← trước' disabled ở đoạn 1, nút 'tiếp →' điều hướng sang đoạn 2", () => {
    renderView();
    const prev = screen.getByRole("button", { name: /← trước/ });
    expect(prev.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /tiếp →/ }));
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("hiện mẹo lần đầu; bấm nút 'giải thích' bật explain và ẩn mẹo", () => {
    renderView();
    expect(screen.getByText(/mẹo: bấm nút "giải thích"/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /giải thích/ }));
    expect(screen.getByText(/chunks đáng học/)).toBeTruthy();
    expect(screen.queryByText(/mẹo: bấm nút/)).toBeNull();
    expect(localStorage.getItem("tie:hint:reader")).toBe("1");
  });

  it("bấm 'đã hiểu' ẩn mẹo và lần sau không hiện lại", () => {
    const first = renderView();
    fireEvent.click(screen.getByRole("button", { name: "đã hiểu" }));
    expect(screen.queryByText(/mẹo: bấm nút/)).toBeNull();
    first.unmount();
    renderView();
    expect(screen.queryByText(/mẹo: bấm nút/)).toBeNull();
  });

  it("enter điều hướng sang đoạn kế tiếp khi còn đoạn phía sau", () => {
    render(
      <PassageView
        book={book}
        chapterId="ch01"
        passage={passages[0]}
        passageIndex={1}
        passageCount={3}
      />,
    );
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("Enter trên một nút đang focus thì không chuyển đoạn, kể cả lúc đang gõ", () => {
    renderView();
    const btn = screen.getByRole("button", { name: /giải thích/ });
    const typingBefore = screen.getByTestId("translation-col").textContent;
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("translation-col").textContent).toBe(typingBefore); // không bỏ qua hiệu ứng gõ
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
  });

  it("bấm chuột vào nút xong thì nút nhả focus: Enter lại là phím sang đoạn", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    const btn = screen.getByRole("button", { name: /giải thích/ });
    btn.focus();
    fireEvent.click(btn, { detail: 1 }); // chuột: detail = số lần bấm
    expect(document.activeElement).not.toBe(btn);
    fireEvent.keyDown(document.activeElement ?? window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("nút được bấm bằng bàn phím (Enter/Space) thì giữ focus", () => {
    renderView();
    const btn = screen.getByRole("button", { name: /giải thích/ });
    btn.focus();
    fireEvent.click(btn, { detail: 0 }); // bàn phím: detail = 0
    expect(document.activeElement).toBe(btn);
  });

  it("Enter trên phần tử con của nút cũng tính là trên nút", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    const kbd = screen.getByRole("button", { name: /giải thích/ }).querySelector("kbd")!;
    fireEvent.keyDown(kbd, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
  });

  it("phím tắt khác trên nút đang focus vẫn chạy", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(screen.getByRole("button", { name: /tiếp →/ }), { key: "ArrowRight" });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("đoạn 1 có hình phác thảo", () => {
    renderView();
    expect(screen.getByTestId("sketch")).toBeTruthy();
  });

  it("đoạn không có sketch thì không render khung phác thảo", () => {
    const { sketch: _sketch, ...noSketch } = passages[0];
    render(
      <PassageView
        book={book}
        chapterId="ch01"
        passage={noSketch}
        passageIndex={1}
        passageCount={passages.length}
      />,
    );
    expect(screen.queryByTestId("sketch")).toBeNull();
  });
});

// RF4: chuyển đoạn thì thanh/popup chọn chữ biến mất ngay, không mang chữ của đoạn cũ sang đoạn mới.
// (Trên app thật Next remount PassageView khi đổi đoạn nên e2e không bắt được nếu bỏ clear();
// ở đây PassageView sống tiếp qua rerender — đúng ý đồ "không remount" của page.tsx.)
describe("PassageView — chọn chữ khi chuyển đoạn", () => {
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
    push.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.useRealTimers();
  });

  function view(i: number) {
    return (
      <PassageView book={book} chapterId="ch01" passage={passages[i - 1]} passageIndex={i} passageCount={passages.length} />
    );
  }

  /** Bôi đen "chronic gambler" trong nguyên văn rồi chờ quá 250ms → popup hiện (jsdom không có matchMedia → desktop). */
  function selectChronicGambler() {
    const root = screen.getByTestId("original-text");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    while (walker.nextNode()) {
      const t = walker.currentNode as Text;
      if (t.data.includes("chronic")) node = t;
      if (node) break;
    }
    // "chronic" là span cụm riêng; " gambler" nằm ở text node kế tiếp
    const next = node!.parentNode!.nextSibling as Text;
    act(() => {
      const range = document.createRange();
      range.setStart(node!, 0);
      range.setEnd(next, " gambler".length);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => void vi.advanceTimersByTime(300));
    expect(window.getSelection()!.toString()).toBe("chronic gambler");
    expect(screen.getByTestId("selection-popup")).toBeTruthy();
  }

  it("bấm Enter sang đoạn kế (goTo) thì popup tắt ngay, vùng chọn bị bỏ", () => {
    render(view(1));
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    selectChronicGambler();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
    expect(screen.queryByTestId("selection-popup")).toBeNull();
    expect(window.getSelection()!.toString()).toBe("");
  });

  it("đổi đoạn không qua goTo (back/forward) thì đoạn mới không có popup của đoạn cũ", () => {
    const { rerender } = render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    selectChronicGambler();
    rerender(view(2));
    expect(screen.getByTestId("original-text").textContent).toContain("Bukowski wanted to be a writer");
    expect(screen.queryByTestId("selection-popup")).toBeNull();
  });
});
