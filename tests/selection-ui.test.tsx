import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { SelectionDock } from "@/components/reader/SelectionDock";
import { SelectionPopup } from "@/components/reader/SelectionPopup";
import { lookupUrl } from "@/lib/selection";
import { isSpeechAvailable, speak } from "@/lib/speech";

vi.mock("@/lib/speech", () => ({
  speak: vi.fn(),
  isSpeechAvailable: vi.fn(() => true),
}));

const rect = { left: 40, top: 200, width: 100, height: 20 };
const sel = (text: string) => ({ text, rect });

beforeEach(() => {
  vi.mocked(isSpeechAvailable).mockReturnValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("SelectionDock", () => {
  it("dock: hiện chữ trong ngoặc kép, bấm 'nghe' gọi speak với đúng chữ", () => {
    render(<SelectionDock selection={sel("chronic gambler")} onKeep={() => {}} />);
    const dock = screen.getByTestId("selection-dock");
    expect(dock.getAttribute("role")).toBe("toolbar");
    expect(dock.getAttribute("aria-label")).toBe("chữ đang chọn");
    expect(dock.textContent).toContain('"chronic gambler"');
    fireEvent.click(screen.getByRole("button", { name: /nghe/ }));
    expect(speak).toHaveBeenCalledWith("chronic gambler");
  });

  it("dock: 6 từ → không có nút 'tra nghĩa'", () => {
    render(<SelectionDock selection={sel("one two three four five six")} onKeep={() => {}} />);
    expect(screen.getByRole("button", { name: /nghe/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
  });

  it("'tra nghĩa' gọi window.open(lookupUrl(text), '_blank', 'noopener')", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<SelectionDock selection={sel("chronic gambler")} onKeep={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(open).toHaveBeenCalledWith(lookupUrl("chronic gambler"), "_blank", "noopener");
  });

  it("pointerdown trên nút gọi onKeep", () => {
    const onKeep = vi.fn();
    render(<SelectionDock selection={sel("chronic gambler")} onKeep={onKeep} />);
    // Sự kiện nổi lên root nên onKeep có thể được gọi nhiều lần cho một lần chạm; keep() idempotent.
    fireEvent.pointerDown(screen.getByRole("button", { name: /nghe/ }));
    expect(onKeep).toHaveBeenCalled();
    onKeep.mockClear();
    fireEvent.pointerDown(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(onKeep).toHaveBeenCalled();
  });

  it("chuột bấm nút / nền dock → không gọi onKeep (onMouseDown đã giữ vùng chọn); chạm thì gọi", () => {
    const onKeep = vi.fn();
    render(<SelectionDock selection={sel("chronic gambler")} onKeep={onKeep} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: /nghe/ }), { pointerType: "mouse" });
    fireEvent.pointerDown(screen.getByRole("button", { name: /tra nghĩa/ }), { pointerType: "mouse" });
    fireEvent.pointerDown(screen.getByText("chronic gambler"), { pointerType: "mouse" });
    expect(onKeep).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole("button", { name: /nghe/ }), { pointerType: "touch" });
    expect(onKeep).toHaveBeenCalled();
    onKeep.mockClear();
    fireEvent.pointerDown(screen.getByRole("button", { name: /tra nghĩa/ }), { pointerType: "pen" });
    expect(onKeep).toHaveBeenCalled();
  });

  it("pointerdown trên dòng chữ của dock cũng gọi onKeep", () => {
    const onKeep = vi.fn();
    render(<SelectionDock selection={sel("chronic gambler")} onKeep={onKeep} />);
    fireEvent.pointerDown(screen.getByText("chronic gambler"));
    expect(onKeep).toHaveBeenCalled();
  });

  it("speech không có → 'nghe' disabled", () => {
    vi.mocked(isSpeechAvailable).mockReturnValue(false);
    render(<SelectionDock selection={sel("chronic gambler")} onKeep={() => {}} />);
    const btn = screen.getByRole("button", { name: /nghe/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBe("trình duyệt không hỗ trợ đọc");
  });
});

describe("SelectionPopup", () => {
  function renderPopup(onKeep = () => {}, text = "chronic gambler") {
    const ref = createRef<HTMLDivElement>();
    render(
      <div ref={ref} style={{ position: "relative" }}>
        <SelectionPopup selection={sel(text)} containerRef={ref} onKeep={onKeep} />
      </div>,
    );
    return screen.getByTestId("selection-popup");
  }

  it("popup: render trong container với data-testid='selection-popup'", () => {
    const popup = renderPopup();
    expect(popup.textContent).toContain("nghe");
    expect(popup.textContent).toContain("tra nghĩa");
    expect(popup.style.left).not.toBe("");
    expect(popup.style.top).not.toBe("");
    expect(popup.className).not.toContain("invisible");
  });

  it("popup: chạm (touch) nền popup gọi onKeep; chuột thì không", () => {
    const onKeep = vi.fn();
    const popup = renderPopup(onKeep);
    fireEvent.pointerDown(popup, { pointerType: "mouse" });
    fireEvent.pointerDown(screen.getByRole("button", { name: /nghe/ }), { pointerType: "mouse" });
    expect(onKeep).not.toHaveBeenCalled();
    fireEvent.pointerDown(popup, { pointerType: "touch" });
    expect(onKeep).toHaveBeenCalled();
  });

  it("popup: role='toolbar', aria-label='chữ đang chọn' như dock", () => {
    const popup = renderPopup();
    expect(popup.getAttribute("role")).toBe("toolbar");
    expect(popup.getAttribute("aria-label")).toBe("chữ đang chọn");
  });

  it("popup: có 'tra nghĩa' thì 'nghe' có đường kẻ ngăn; 6 từ (không 'tra nghĩa') thì không", () => {
    renderPopup(undefined, "chronic gambler");
    expect(screen.getByRole("button", { name: /nghe/ }).className).toContain("border-r");
    cleanup();
    renderPopup(undefined, "one two three four five six");
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
    expect(screen.getByRole("button", { name: /nghe/ }).className).not.toContain("border-r");
  });
});
