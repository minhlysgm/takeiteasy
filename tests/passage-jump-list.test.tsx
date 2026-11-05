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
    expect(rows[0].querySelector(".sr-only")).toBeTruthy();
    expect(rows[1].querySelector(".sr-only")).toBeTruthy();
    expect(rows[2].querySelector(".sr-only")).toBeNull();
    expect(screen.getByText("2/3 đoạn đã đọc")).toBeTruthy();
    // ✓ ẩn khỏi trình đọc màn hình, thay bằng chữ sr-only
    expect(rows[0].querySelector(".sr-only")?.textContent).toBe("đã đọc");
    expect(rows[0].querySelector('[aria-hidden="true"]')?.textContent).toBe("✓");
  });

  it("đếm đã đọc chỉ tính các đoạn có trong chương (bỏ chỉ số thừa)", () => {
    setup({ read: [1, 2, 9, 10] });
    expect(screen.getByText("2/3 đoạn đã đọc")).toBeTruthy();
  });

  it("focus rời khỏi danh sách sang chỗ khác → onClose('key'); chuyển giữa các dòng / chuột (relatedTarget null) thì không", async () => {
    const props = setup();
    const rows = screen.getAllByTestId("jump-row");
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    rows[0].focus(); // chuyển giữa các dòng
    rows[2].focus();
    fireEvent.blur(rows[2], { relatedTarget: null }); // bấm ra ngoài / tự gỡ: không đổi focus
    await Promise.resolve();
    expect(props.onClose).not.toHaveBeenCalled();
    rows[1].focus();
    outside.focus(); // Tab ra ngoài
    await Promise.resolve();
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenLastCalledWith("key");
    outside.remove();
  });

  it("focus nhảy ra ngoài rồi quay lại ngay (StrictMode / hook trả focus) thì không đóng", async () => {
    const props = setup();
    const rows = screen.getAllByTestId("jump-row");
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    rows[1].focus();
    outside.focus();
    rows[1].focus();
    await Promise.resolve();
    expect(props.onClose).not.toHaveBeenCalled();
    outside.remove();
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

  it("onClose cho biết đóng bằng gì: chuột/chạm → 'pointer', phím (Esc, Enter/Space trên ✕) → 'key'", () => {
    const props = setup();
    fireEvent.click(screen.getByTestId("jump-backdrop"), { detail: 1 });
    expect(props.onClose).toHaveBeenLastCalledWith("pointer");
    fireEvent.click(screen.getByRole("button", { name: "đóng" }), { detail: 1 });
    expect(props.onClose).toHaveBeenLastCalledWith("pointer");
    fireEvent.click(screen.getByRole("button", { name: "đóng" }), { detail: 0 });
    expect(props.onClose).toHaveBeenLastCalledWith("key");
    fireEvent.keyDown(screen.getByTestId("jump-list"), { key: "Escape" });
    expect(props.onClose).toHaveBeenLastCalledWith("key");
  });
});
