import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { SelectionDock } from "@/components/reader/SelectionDock";
import { SelectionPopup } from "@/components/reader/SelectionPopup";
import { lookupUrl } from "@/lib/selection";
import { speak } from "@/lib/speech";

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

const rect = { left: 40, top: 200, width: 100, height: 20 };
const sel = (text: string) => ({ text, rect, start: 0, end: text.length });

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("SelectionDock", () => {
  it("dock: hiện chữ trong ngoặc kép, bấm 'nghe' gọi speak với đúng chữ", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk />);
    const dock = screen.getByTestId("selection-dock");
    expect(dock.getAttribute("role")).toBe("toolbar");
    expect(dock.getAttribute("aria-label")).toBe("chữ đang chọn");
    expect(dock.textContent).toContain('"chronic gambler"');
    fireEvent.click(screen.getByRole("button", { name: /nghe/ }));
    expect(speak).toHaveBeenCalledWith("chronic gambler");
  });

  it("dock: 11 từ → không có nút 'tra nghĩa'", () => {
    render(<SelectionDock selection={sel("one two three four five six seven eight nine ten eleven")} speechOk />);
    expect(screen.getByRole("button", { name: /nghe/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
  });

  it("'tra nghĩa' gọi window.open(lookupUrl(text), '_blank', 'noopener')", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<SelectionDock selection={sel("chronic gambler")} speechOk />);
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(open).toHaveBeenCalledWith(lookupUrl("chronic gambler"), "_blank", "noopener");
  });

  it("dock đánh dấu data-selection-ui để hook biết chạm vào thanh", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk />);
    expect(screen.getByTestId("selection-dock").hasAttribute("data-selection-ui")).toBe(true);
  });

  it("chữ dài bị cắt vẫn giữ dấu ngoặc đóng: chỉ phần chữ có .truncate", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk />);
    const b = screen.getByText("chronic gambler");
    expect(b.className).toContain("truncate");
    expect(b.nextSibling?.textContent).toBe('"');
  });

  it("speech không có (speechOk=false) → 'nghe' disabled", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk={false} />);
    const btn = screen.getByRole("button", { name: /nghe/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBe("trình duyệt không hỗ trợ đọc");
  });
});

describe("SelectionPopup", () => {
  function renderPopup(text = "chronic gambler") {
    const ref = createRef<HTMLDivElement>();
    render(
      <div ref={ref} style={{ position: "relative" }}>
        <SelectionPopup selection={sel(text)} containerRef={ref} speechOk />
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

  it("popup đánh dấu data-selection-ui; nút có hover", () => {
    const popup = renderPopup();
    expect(popup.hasAttribute("data-selection-ui")).toBe(true);
    expect(screen.getByRole("button", { name: /nghe/ }).className).toContain("hover:");
  });

  it("popup: role='toolbar', aria-label='chữ đang chọn' như dock", () => {
    const popup = renderPopup();
    expect(popup.getAttribute("role")).toBe("toolbar");
    expect(popup.getAttribute("aria-label")).toBe("chữ đang chọn");
  });

  it("popup: có 'tra nghĩa' thì 'nghe' có đường kẻ ngăn; 11 từ (không 'tra nghĩa') thì không", () => {
    renderPopup("chronic gambler");
    expect(screen.getByRole("button", { name: /nghe/ }).className).toContain("border-r");
    cleanup();
    renderPopup("one two three four five six seven eight nine ten eleven");
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
    expect(screen.getByRole("button", { name: /nghe/ }).className).not.toContain("border-r");
  });
});
