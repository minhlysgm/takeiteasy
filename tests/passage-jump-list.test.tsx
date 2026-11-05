import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PassageJumpList } from "@/components/reader/PassageJumpList";

const outline = [
  { index: 1, firstSentence: "First one." },
  { index: 2, firstSentence: "Second one." },
  { index: 3, firstSentence: "" },
];

function setup(over: Partial<React.ComponentProps<typeof PassageJumpList>> = {}) {
  const props = {
    title: "Chương 1 · Don't Try",
    outline,
    current: 2,
    read: [1, 2],
    onPick: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<PassageJumpList {...props} />);
  return props;
}

describe("PassageJumpList", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("vẽ đủ dòng, câu mở đầu, ✓ đúng dòng đã đọc, aria-current ở dòng hiện tại", () => {
    setup();
    const rows = screen.getAllByTestId("jump-row");
    expect(rows).toHaveLength(3);
    expect(screen.getByText("First one.")).toBeTruthy();
    expect(rows[1].getAttribute("aria-current")).toBe("true");
    expect(rows[1].textContent).toContain("đang đọc");
    expect(rows[0].getAttribute("aria-current")).toBeNull();
    expect(rows[0].querySelector('[aria-label="đã đọc"]')).toBeTruthy();
    expect(rows[1].querySelector('[aria-label="đã đọc"]')).toBeTruthy();
    expect(rows[2].querySelector('[aria-label="đã đọc"]')).toBeNull();
    expect(screen.getByText("2/3 đoạn đã đọc")).toBeTruthy();
  });

  it("bấm dòng 1 → onPick(1)", () => {
    const props = setup();
    fireEvent.click(screen.getAllByTestId("jump-row")[0]);
    expect(props.onPick).toHaveBeenCalledWith(1);
  });

  it("focus dòng hiện tại lúc mở; ArrowUp sang dòng 1; ArrowDown ở dòng cuối giữ nguyên", () => {
    setup();
    const rows = screen.getAllByTestId("jump-row");
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.keyDown(rows[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(rows[0]);
    rows[2].focus();
    fireEvent.keyDown(rows[2], { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[2]);
  });

  it("bấm backdrop → onClose; bấm ✕ → onClose", () => {
    const props = setup();
    fireEvent.click(screen.getByTestId("jump-backdrop"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "đóng" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
