import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useTextSelection } from "@/lib/useTextSelection";

const RECT = { left: 40, top: 100, width: 120, height: 20 };

function Host() {
  const ref = useRef<HTMLDivElement>(null);
  const { selection, clear } = useTextSelection(ref);
  return (
    <>
      <div ref={ref}>
        <p data-testid="inside">He is a chronic gambler today</p>
        <p data-testid="punct">... --- ???</p>
        <div data-testid="nested">ab<span>cd</span>ef</div>
      </div>
      <p data-testid="outside">somewhere else entirely</p>
      <div data-selection-ui="" data-testid="toolbar">
        <button type="button" data-testid="keep">
          keep
        </button>
      </div>
      <button type="button" data-testid="clear" onClick={clear}>
        clear
      </button>
      <output data-testid="text">{selection ? selection.text : "null"}</output>
      <output data-testid="offsets">{selection ? `${selection.start},${selection.end}` : "null"}</output>
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

  it("trả start/end đúng offset trong container", () => {
    render(<Host />);
    // container.textContent = "He is a chronic gambler today" + "... --- ???" + "abcdef"; chọn "chronic gambler"
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    expect(screen.getByTestId("offsets").textContent).toBe("8,23");
  });

  it("start/end đếm xuyên phần tử con (chọn 'cde' trong ab<span>cd</span>ef)", () => {
    render(<Host />);
    const nested = screen.getByTestId("nested");
    const base = "He is a chronic gambler today".length + "... --- ???".length;
    select(nested.firstChild as Text, 0 + 2, nested.lastChild as Text, 1);
    advance(250);
    expect(screen.getByTestId("offsets").textContent).toBe(`${base + 2},${base + 5}`);
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

  it("chạm thanh ([data-selection-ui]): bỏ chọn trong 800ms vẫn giữ selection; pointerdown ngoài sau đó → null", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    expect(text()).toBe("chronic gambler");

    pointer("pointerdown", screen.getByTestId("keep"));
    collapse();
    advance(300);
    expect(text()).toBe("chronic gambler");

    advance(600); // quá 800ms kể từ lúc chạm thanh
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

  it("chạm thanh khi vùng chọn đã xẹp → vẫn giữ (hook tự nhận ra thanh, không dựa thứ tự listener)", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    collapse(false);
    pointer("pointerdown", screen.getByTestId("keep"));
    expect(text()).toBe("chronic gambler");
    pointer("pointerdown", screen.getByTestId("toolbar")); // chỗ trống của thanh cũng vậy
    expect(text()).toBe("chronic gambler");
  });

  it("chuột bấm thanh không bật hạn giữ: click ra ngoài ngay sau đó làm xẹp → null", () => {
    render(<Host />);
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
    pointer("pointerdown", screen.getByTestId("keep"), "mouse");
    pointer("pointerup", screen.getByTestId("keep"), "mouse");
    expect(text()).toBe("chronic gambler");
    pointer("pointerdown", screen.getByTestId("outside"), "mouse");
    collapse(false);
    pointer("pointerup", screen.getByTestId("outside"), "mouse");
    expect(text()).toBe("null");
  });

  it("đang giữ chuột mà rời cửa sổ (alt-tab) → không kẹt: bôi đen bằng bàn phím sau đó vẫn công bố", () => {
    render(<Host />);
    pointer("pointerdown", screen.getByTestId("inside"), "mouse");
    act(() => void window.dispatchEvent(new Event("blur")));
    select(textNode("inside"), 8, textNode("inside"), 23);
    advance(250);
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
    // React tự gắn listener `selectionchange` lên document ở lần render đầu tiên và không bao giờ gỡ;
    // render nháp trước khi cài spy để chỉ còn lại listener của chính hook.
    render(<div />).unmount();
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
    const added = addSpy.mock.calls.filter(([type]) =>
      ["selectionchange", "pointerdown", "pointerup", "pointercancel"].includes(type),
    );
    expect(added.map(([type]) => type).sort()).toEqual(
      ["pointercancel", "pointerdown", "pointerup", "selectionchange"],
    );
    for (const [type, fn] of added) {
      expect(removeSpy).toHaveBeenCalledWith(type, fn);
    }
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
