import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
