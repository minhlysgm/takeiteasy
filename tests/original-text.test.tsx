import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OriginalText } from "@/components/reader/OriginalText";
import { books, getPassages } from "@/lib/content";

const passage = getPassages(books[0].id, "ch01")![0];
const badges = () => screen.queryAllByTestId("chunk-badge");

describe("OriginalText", () => {
  it("tắt giải thích thì không có số", () => {
    render(<OriginalText passage={passage} explainOn={false} onChunkClick={() => {}} />);
    expect(badges()).toHaveLength(0);
  });
  it("bật giải thích: mỗi cụm một số 1..n, số không phải chữ trong văn bản và trình đọc màn hình bỏ qua", () => {
    const { container } = render(<OriginalText passage={passage} explainOn onChunkClick={() => {}} />);
    expect(passage.chunks).toHaveLength(5);
    expect(badges().map((b) => b.dataset.n)).toEqual(["1", "2", "3", "4", "5"]);
    for (const b of badges()) expect(b.getAttribute("aria-hidden")).toBe("true");
    // số vẽ bằng CSS (::after) → bôi đen / copy / "nghe" không dính số
    expect(container.textContent).toBe(passage.original);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("chạm số 3 gọi onChunkClick với id chunk thứ 3", () => {
    const onChunkClick = vi.fn();
    render(<OriginalText passage={passage} explainOn onChunkClick={onChunkClick} />);
    fireEvent.click(badges()[2]);
    expect(onChunkClick).toHaveBeenCalledWith(passage.chunks[2].id);
  });
});
