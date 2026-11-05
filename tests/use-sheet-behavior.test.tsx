import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOBILE_QUERY } from "@/lib/breakpoints";
import { useSheetBehavior } from "@/lib/useSheetBehavior";

function Sheet({ options }: { options?: Parameters<typeof useSheetBehavior>[1] }) {
  const ref = useRef<HTMLDivElement>(null);
  const sheet = useSheetBehavior(ref, options);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" onKeyDown={sheet.onKeyDown}>
      <button type="button">đầu</button>
      <button type="button">giữa</button>
      <button type="button">cuối</button>
    </div>
  );
}

const stubMedia = (matches: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q: string) => ({
      matches: matches && q === MOBILE_QUERY,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );

describe("useSheetBehavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = "";
    document.body.innerHTML = "";
  });

  it("mobile: khoá cuộn body + aria-modal, unmount thì trả lại", () => {
    stubMedia(true);
    document.body.style.overflow = "";
    const { unmount } = render(<Sheet />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("desktop: không khoá cuộn, không aria-modal", () => {
    stubMedia(false);
    render(<Sheet />);
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByRole("dialog").hasAttribute("aria-modal")).toBe(false);
  });

  it("focus vào phần tử lúc mount, trả focus về nút cũ lúc unmount", () => {
    stubMedia(false);
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);
    const { unmount } = render(<Sheet />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    unmount();
    expect(document.activeElement).toBe(opener);
  });

  it("mặc định trả focus có cuộn (phần tử cũ có thể đã trôi khỏi màn hình)", () => {
    stubMedia(false);
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const spy = vi.spyOn(opener, "focus");
    const { unmount } = render(<Sheet />);
    unmount();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]?.preventScroll).not.toBe(true);
  });

  it("restoreFocus: focus (không cuộn) vào phần tử trả về; null → không đụng tới focus", () => {
    stubMedia(false);
    const opener = document.createElement("button");
    const target = document.createElement("button");
    const elsewhere = document.createElement("button");
    document.body.append(opener, target, elsewhere);
    opener.focus();
    const spy = vi.spyOn(target, "focus");
    const first = render(<Sheet options={{ restoreFocus: () => target }} />);
    first.unmount();
    expect(document.activeElement).toBe(target);
    expect(spy.mock.calls[0][0]).toEqual({ preventScroll: true });

    opener.focus();
    const second = render(<Sheet options={{ restoreFocus: () => null }} />);
    elsewhere.focus(); // vd. Tab ra ngoài trước khi tấm đóng
    second.unmount();
    expect(document.activeElement).toBe(elsewhere);
  });

  it("initialFocus: focus (không cuộn) vào phần tử trả về thay cho khung", () => {
    stubMedia(false);
    function WithInitial() {
      const ref = useRef<HTMLDivElement>(null);
      useSheetBehavior(ref, { initialFocus: () => ref.current?.querySelector<HTMLElement>("[data-pick]") ?? null });
      return (
        <div ref={ref} tabIndex={-1} role="dialog">
          <button type="button">đầu</button>
          <button type="button" data-pick>
            chọn
          </button>
        </div>
      );
    }
    render(<WithInitial />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "chọn" }));
  });

  it("mobile: Tab ở nút cuối quay về nút đầu; Shift+Tab ở nút đầu sang nút cuối", () => {
    stubMedia(true);
    render(<Sheet />);
    const first = screen.getByRole("button", { name: "đầu" });
    const last = screen.getByRole("button", { name: "cuối" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
