import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useTextSelection } from "@/lib/useTextSelection";

const RECT = { left: 40, top: 100, width: 120, height: 20 };

function Host() {
  const ref = useRef<HTMLDivElement>(null);
  const { selection, keep, clear } = useTextSelection(ref);
  return (
    <>
      <div ref={ref}>
        <p data-testid="inside">He is a chronic gambler today</p>
        <p data-testid="punct">... --- ???</p>
      </div>
      <p data-testid="outside">somewhere else entirely</p>
      <button type="button" data-testid="keep" onPointerDown={keep}>
        keep
      </button>
      <button type="button" data-testid="clear" onClick={clear}>
        clear
      </button>
      <output data-testid="text">{selection ? selection.text : "null"}</output>
      <output data-testid="rect">{selection ? JSON.stringify(selection.rect) : "null"}</output>
    </>
  );
}

const text = () => screen.getByTestId("text").textContent;
const textNode = (id: string) => screen.getByTestId(id).firstChild as Text;

function select(a: Text, from: number, b: Text = a, to: number = from) {
  act(() => {
    const range = document.createRange();
    range.setStart(a, from);
    range.setEnd(b, to);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
}

function collapse(fire = true) {
  act(() => {
    window.getSelection()!.removeAllRanges();
    if (fire) document.dispatchEvent(new Event("selectionchange"));
  });
}

function pointer(type: string, target: Element | Document, pointerType = "touch") {
  act(() => {
    target.dispatchEvent(
      Object.assign(new Event(type, { bubbles: true }), { pointerType, button: 0 }),
    );
  });
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("useTextSelection", () => {
  const original = Range.prototype.getBoundingClientRect;
  beforeAll(() => {
    Range.prototype.getBoundingClientRect = () => ({ ...RECT, right: 160, bottom: 120, x: 40, y: 100, toJSON() {} });
  });
  afterAll(() => {
    Range.prototype.getBoundingClientRect = original;
  });
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.useRealTimers();
  });

  it("chưa đủ 250ms thì chưa có; đủ 250ms thì có text 'chronic gambler'", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(249);
    expect(text()).toBe("null");
    advance(1);
    expect(text()).toBe("chronic gambler");
    expect(JSON.parse(screen.getByTestId("rect").textContent!)).toEqual(RECT);
  });

  it("selectionchange mới thì đếm lại từ đầu", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 15);
    advance(200);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(200);
    expect(text()).toBe("null");
    advance(50);
    expect(text()).toBe("chronic gambler");
  });

  it("anchor trong, focus ngoài container → null", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("outside"), 4);
    advance(300);
    expect(text()).toBe("null");
  });

  it("chỉ chọn dấu câu → null", () => {
    render(<Host />);
    select(textNode("punct"), 0, textNode("punct"), 11);
    advance(300);
    expect(text()).toBe("null");
  });

  it("chuột đang giữ thì không công bố; pointerup thì công bố ngay", () => {
    render(<Host />);
    pointer("pointerdown", screen.getByTestId("inside"), "mouse");
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(500);
    expect(text()).toBe("null");
    pointer("pointerup", screen.getByTestId("inside"), "mouse");
    expect(text()).toBe("chronic gambler");
  });

  it("chuột: click làm vùng chọn xẹp (không có keep) → null ngay khi pointerup", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    expect(text()).toBe("chronic gambler");
    pointer("pointerdown", screen.getByTestId("inside"), "mouse");
    collapse(false);
    pointer("pointerup", screen.getByTestId("inside"), "mouse");
    expect(text()).toBe("null");
  });

  it("keep(): bỏ chọn trong 800ms vẫn giữ selection; pointerdown ngoài sau đó → null", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    expect(text()).toBe("chronic gambler");

    pointer("pointerdown", screen.getByTestId("keep"));
    collapse();
    advance(300);
    expect(text()).toBe("chronic gambler");

    advance(600); // quá 800ms kể từ keep()
    pointer("pointerdown", screen.getByTestId("outside"));
    expect(text()).toBe("null");
  });

  it("pointerdown ngoài khi vùng chọn còn nguyên → không xoá", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    pointer("pointerdown", screen.getByTestId("outside"));
    expect(text()).toBe("chronic gambler");
  });

  it("pointerdown trên nút (onPointerDown={keep}) chạy keep trước listener của document", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    collapse(false); // vùng chọn đã xẹp, chưa từng keep() → nếu keep() không chạy trước thì sẽ bị xoá
    pointer("pointerdown", screen.getByTestId("keep"));
    expect(text()).toBe("chronic gambler");
  });

  it("clear() xoá selection và vùng chọn của trình duyệt", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    expect(text()).toBe("chronic gambler");
    act(() => screen.getByTestId("clear").click());
    expect(text()).toBe("null");
    expect(window.getSelection()!.rangeCount).toBe(0);
  });

  it("gỡ listener và timer khi unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    unmount();
    // timer settle còn treo mà chạy thì sẽ đọc vùng chọn → không được xảy ra
    const getSel = vi.spyOn(window, "getSelection");
    advance(1000);
    expect(getSel).not.toHaveBeenCalled();
    getSel.mockRestore();
    for (const [type, fn] of addSpy.mock.calls) {
      if (["selectionchange", "pointerdown", "pointerup", "pointercancel"].includes(type)) {
        expect(removeSpy).toHaveBeenCalledWith(type, fn);
      }
    }
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
