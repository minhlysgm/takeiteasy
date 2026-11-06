import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { createRef } from "react";
import type { LookupState } from "@/components/reader/LookupCard";
import { SelectionDock } from "@/components/reader/SelectionDock";
import { SelectionPopup } from "@/components/reader/SelectionPopup";
import { play } from "@/lib/audio/player";

vi.mock("@/lib/audio/player", () => ({ play: vi.fn() }));

const rect = { left: 40, top: 200, width: 100, height: 20 };
const sel = (text: string) => ({ text, rect, start: 0, end: text.length });
const ELEVEN = "one two three four five six seven eight nine ten eleven";
/** Props tra nghĩa mặc định: chưa mở thẻ. */
const lk = (lookup: LookupState | null = null): { lookup: LookupState | null; onLookUp: Mock; onCloseLookup: Mock } => ({
  lookup,
  onLookUp: vi.fn(),
  onCloseLookup: vi.fn(),
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("SelectionDock", () => {
  it("dock: hiện chữ trong ngoặc kép, bấm 'nghe' gọi play (giọng máy) với đúng chữ", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk {...lk()} />);
    const dock = screen.getByTestId("selection-dock");
    const bar = screen.getByRole("toolbar", { name: "chữ đang chọn" });
    expect(dock.contains(bar)).toBe(true);
    expect(dock.textContent).toContain('"chronic gambler"');
    fireEvent.click(screen.getByRole("button", { name: /nghe/ }));
    expect(play).toHaveBeenCalledWith("tts:chronic gambler", { text: "chronic gambler" });
  });

  it("dock: 11 từ → không có nút 'tra nghĩa'", () => {
    render(<SelectionDock selection={sel(ELEVEN)} speechOk {...lk()} />);
    expect(screen.getByRole("button", { name: /nghe/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
  });

  it("'tra nghĩa' gọi onLookUp, không mở tab", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const props = lk();
    render(<SelectionDock selection={sel("chronic gambler")} speechOk {...props} />);
    const btn = screen.getByRole("button", { name: /tra nghĩa/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(props.onLookUp).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it("11 từ → không có nút tra nghĩa, có chữ 'dài quá để tra · xem bản dịch bên cạnh'", () => {
    render(<SelectionDock selection={sel(ELEVEN)} speechOk {...lk()} />);
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
    expect(screen.getByTestId("selection-dock").textContent).toContain("dài quá để tra · xem bản dịch bên cạnh");
  });

  it("dock có lookup → thẻ nằm trong dock (ngoài toolbar), 'tra nghĩa' aria-expanded + aria-controls trỏ vào thẻ", () => {
    const props = lk({ phase: "loading" });
    render(<SelectionDock selection={sel("lout")} speechOk {...props} />);
    const dock = screen.getByTestId("selection-dock");
    const card = screen.getByTestId("lookup-card");
    expect(dock.contains(card)).toBe(true);
    expect(screen.getByRole("toolbar").contains(card)).toBe(false);
    const btn = screen.getByRole("button", { name: /tra nghĩa/ });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(card.id).not.toBe("");
    expect(btn.getAttribute("aria-controls")).toBe(card.id);
  });

  it("dock có lookup → ✕ 'đóng thẻ' nằm cùng hàng nút (đẩy sang phải), có hover, gọi onCloseLookup", () => {
    const props = lk({ phase: "loading" });
    render(<SelectionDock selection={sel("lout")} speechOk {...props} />);
    const x = screen.getByRole("button", { name: "đóng thẻ" });
    expect(screen.getByRole("toolbar").contains(x)).toBe(true);
    expect(screen.getByTestId("lookup-card").contains(x)).toBe(false);
    for (const c of ["ml-auto", "hover:bg-bg", "transition-colors", "motion-reduce:transition-none", "h-11", "w-11"]) {
      expect(x.className.split(" ")).toContain(c);
    }
    fireEvent.click(x);
    expect(props.onCloseLookup).toHaveBeenCalledTimes(1);
  });

  it("dock chưa mở thẻ → không có ✕, 'tra nghĩa' không có aria-controls", () => {
    render(<SelectionDock selection={sel("lout")} speechOk {...lk()} />);
    expect(screen.queryByRole("button", { name: "đóng thẻ" })).toBeNull();
    expect(screen.getByRole("button", { name: /tra nghĩa/ }).hasAttribute("aria-controls")).toBe(false);
  });

  it("dock không có lookup → không có thẻ", () => {
    render(<SelectionDock selection={sel("lout")} speechOk {...lk()} />);
    expect(screen.queryByTestId("lookup-card")).toBeNull();
  });

  it("dock đánh dấu data-selection-ui để hook biết chạm vào thanh", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk {...lk()} />);
    expect(screen.getByTestId("selection-dock").hasAttribute("data-selection-ui")).toBe(true);
  });

  it("chữ dài bị cắt vẫn giữ dấu ngoặc đóng: chỉ phần chữ có .truncate", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk {...lk()} />);
    const b = screen.getByText("chronic gambler");
    expect(b.className).toContain("truncate");
    expect(b.nextSibling?.textContent).toBe('"');
  });

  it("speech không có (speechOk=false) → 'nghe' disabled", () => {
    render(<SelectionDock selection={sel("chronic gambler")} speechOk={false} {...lk()} />);
    const btn = screen.getByRole("button", { name: /nghe/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBe("trình duyệt không hỗ trợ đọc");
  });
});

describe("SelectionPopup", () => {
  function renderPopup(text = "chronic gambler", props = lk()) {
    const ref = createRef<HTMLDivElement>();
    render(
      <div ref={ref} style={{ position: "relative" }}>
        <SelectionPopup selection={sel(text)} containerRef={ref} speechOk {...props} />
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

  it("popup: hàng nút là role='toolbar', aria-label='chữ đang chọn' như dock", () => {
    const popup = renderPopup();
    expect(popup.contains(screen.getByRole("toolbar", { name: "chữ đang chọn" }))).toBe(true);
  });

  it("popup: 'nghe' có đường kẻ ngăn với 'tra nghĩa' (hoặc với chữ 'dài quá để tra' khi 11 từ)", () => {
    renderPopup("chronic gambler");
    expect(screen.getByRole("button", { name: /nghe/ }).className).toContain("border-r");
    cleanup();
    const popup = renderPopup(ELEVEN);
    expect(screen.queryByRole("button", { name: /tra nghĩa/ })).toBeNull();
    expect(popup.textContent).toContain("dài quá để tra · xem bản dịch bên cạnh");
    expect(screen.getByRole("button", { name: /nghe/ }).className).toContain("border-r");
  });

  it("popup có lookup → thẻ nằm trong popup (ngoài toolbar), popup rộng 360px, aria-controls trỏ vào thẻ", () => {
    const popup = renderPopup("lout", lk({ phase: "loading" }));
    const card = screen.getByTestId("lookup-card");
    expect(popup.contains(card)).toBe(true);
    expect(screen.getByRole("toolbar").contains(card)).toBe(false);
    expect(popup.className).toContain("w-[360px]");
    const btn = screen.getByRole("button", { name: /tra nghĩa/ });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.getAttribute("aria-controls")).toBe(card.id);
  });

  it("popup có lookup → ✕ 'đóng thẻ' ở hàng nút, đẩy sang phải, có hover, gọi onCloseLookup", () => {
    const props = lk({ phase: "ok", result: { headword: "lout", ipa: "/laʊt/", pos: "danh từ", meaning: "m", example: { en: "e", vi: "v" } } });
    renderPopup("lout", props);
    const x = screen.getByRole("button", { name: "đóng thẻ" });
    expect(screen.getByRole("toolbar").contains(x)).toBe(true);
    for (const c of ["ml-auto", "hover:bg-bg", "transition-colors", "motion-reduce:transition-none"]) {
      expect(x.className.split(" ")).toContain(c);
    }
    fireEvent.click(x);
    expect(props.onCloseLookup).toHaveBeenCalledTimes(1);
  });

  it("popup chưa mở thẻ → không có ✕", () => {
    renderPopup("lout");
    expect(screen.queryByRole("button", { name: "đóng thẻ" })).toBeNull();
  });

  it("popup: bấm 'tra nghĩa' gọi onLookUp", () => {
    const props = lk();
    renderPopup("lout", props);
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(props.onLookUp).toHaveBeenCalledTimes(1);
  });
});
