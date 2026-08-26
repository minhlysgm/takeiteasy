import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import { books, getPassages } from "@/lib/content";
import { getProgress } from "@/lib/progress";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
});
