import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import { books, firstSentence, getPassages } from "@/lib/content";
import { getProgress } from "@/lib/progress";
import { getReadPassages } from "@/lib/readPassages";
import { speak } from "@/lib/speech";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/speech", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/speech")>()),
  speak: vi.fn(),
}));
// nút "giải thích" mount AnnotationLayer → cần mock rough-notation (jsdom không vẽ SVG được)
vi.mock("rough-notation", () => ({
  annotate: () => ({ remove: () => {} }),
  annotationGroup: () => ({ show: () => {} }),
}));

const book = books[0];
const passages = getPassages(book.id, "ch01")!;
const outline = passages.map((p, i) => ({ index: i + 1, firstSentence: firstSentence(p.original) }));
const chapterTitle = "Chương 1 · Don't Try";

function renderView() {
  return render(
    <PassageView
      outline={outline}
      chapterTitle={chapterTitle}
      book={book}
      chapterId="ch01"
      passage={passages[0]}
      passageIndex={1}
      passageCount={passages.length}
    />,
  );
}

function view2() {
  return (
    <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[1]} passageIndex={2} passageCount={passages.length} />
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
    expect(document.querySelector("header")!.textContent).toContain(`đoạn 1/${passages.length}`);
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
        outline={outline}
        chapterTitle={chapterTitle}
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

  it("Shift+←/→ là để nới vùng chọn của trình duyệt: không chuyển đoạn", () => {
    render(view2());
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });
    expect(push).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/3");
  });

  it("đoạn 1 có hình phác thảo", () => {
    renderView();
    expect(screen.getByTestId("sketch")).toBeTruthy();
  });

  it("đoạn không có sketch thì không render khung phác thảo", () => {
    const { sketch: _sketch, ...noSketch } = passages[0];
    render(
      <PassageView
        outline={outline}
        chapterTitle={chapterTitle}
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

describe("PassageView — danh sách đoạn (g / Home / End)", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  const skipTyping = () => fireEvent.keyDown(window, { key: "x" });
  const list = () => screen.queryByTestId("jump-list");

  it("phím g mở danh sách, g lần nữa đóng", () => {
    renderView();
    skipTyping();
    fireEvent.keyDown(window, { key: "g" });
    expect(list()).toBeTruthy();
    expect(screen.getAllByTestId("jump-row")).toHaveLength(passages.length);
    expect(screen.getByText(chapterTitle)).toBeTruthy();
    fireEvent.keyDown(window, { key: "g" });
    expect(list()).toBeNull();
  });

  it("Home → router.push('/read/<book>/<ch>/1'); End → đoạn cuối", () => {
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "Home" });
    expect(push).toHaveBeenLastCalledWith("/read/the-subtle-art/ch01/1");
    fireEvent.keyDown(window, { key: "End" });
    expect(push).toHaveBeenLastCalledWith(`/read/the-subtle-art/ch01/${passages.length}`);
  });

  it("tấm giải thích đang mở: g/Home/End không làm gì", () => {
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.click(screen.getByTestId("mobile-notes").querySelector("button")!);
    expect(screen.getByRole("dialog")).toBeTruthy();
    for (const key of ["g", "Home", "End"]) fireEvent.keyDown(window, { key });
    expect(push).not.toHaveBeenCalled();
    expect(list()).toBeNull();
  });

  it("ngăn giải thích đang mở (desktop: footer vẫn bấm được) mà bấm bộ đếm → đóng ngăn, chỉ còn danh sách", () => {
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.click(screen.getByTestId("mobile-notes").querySelector("button")!);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("jump-trigger"));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(list()).toBeTruthy();
  });

  it("danh sách mở: ArrowRight/Enter/e/s không chuyển đoạn, không bật giải thích, không đọc to", () => {
    vi.mocked(speak).mockClear();
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "g" });
    for (const key of ["ArrowRight", "Enter", "e", "s", "ArrowLeft"]) fireEvent.keyDown(window, { key });
    expect(push).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    expect(screen.queryByText(/chunks đáng học/)).toBeNull();
    expect(list()).toBeTruthy();
  });

  it("danh sách mở + Escape: đóng danh sách nhưng không tắt chế độ giải thích phía sau", () => {
    renderView();
    skipTyping();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(list()).toBeNull();
    expect(screen.getByText(/chunks đáng học/)).toBeTruthy();
  });

  it("chọn một dòng → đóng danh sách và chuyển tới đoạn đó", () => {
    render(view2());
    skipTyping();
    fireEvent.click(screen.getByTestId("jump-trigger"));
    expect(screen.getByTestId("jump-trigger").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getAllByTestId("jump-row")[2]);
    expect(list()).toBeNull();
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/3");
  });

  it("mở đoạn thì ghi vào tie:read; danh sách hiện ✓ các đoạn đã mở", () => {
    const { rerender } = render(view2());
    expect(getReadPassages(book.id, "ch01")).toEqual([2]);
    rerender(
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[0]} passageIndex={1} passageCount={passages.length} />,
    );
    expect(getReadPassages(book.id, "ch01")).toEqual([1, 2]);
    skipTyping();
    fireEvent.click(screen.getByTestId("jump-trigger-mobile"));
    const rows = screen.getAllByTestId("jump-row");
    expect(rows.map((r) => r.textContent?.includes("✓"))).toEqual([true, true, false]);
  });

  it("đổi đoạn không qua danh sách (back/forward) thì danh sách đóng", () => {
    const { rerender } = render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "g" });
    expect(list()).toBeTruthy();
    rerender(
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[0]} passageIndex={1} passageCount={passages.length} />,
    );
    expect(list()).toBeNull();
  });
});

// RF4: chuyển đoạn thì thanh/popup chọn chữ biến mất ngay, không mang chữ của đoạn cũ sang đoạn mới.
// PassageView sống tiếp qua rerender, như trên app thật (nằm ở layout của chương).
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
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[i - 1]} passageIndex={i} passageCount={passages.length} />
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

  it("Escape tắt popup và bỏ vùng chọn", () => {
    render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    selectChronicGambler();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("selection-popup")).toBeNull();
    expect(window.getSelection()!.toString()).toBe("");
  });

  it("bôi đen chữ trong ghi chú tay (ngoài nguyên văn nhưng cùng cột) → không có popup", () => {
    render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(window, { key: "e" }); // bật giải thích → hiện ghi chú tay
    const label = screen.getByTestId("mobile-notes").querySelector("li span:last-child")!.firstChild as Text;
    act(() => {
      const range = document.createRange();
      range.setStart(label, 0);
      range.setEnd(label, Math.min(5, label.data.length));
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => void vi.advanceTimersByTime(300));
    expect(window.getSelection()!.toString()).not.toBe("");
    expect(screen.queryByTestId("selection-popup")).toBeNull();
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
