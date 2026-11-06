import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import { DOCK_QUERY } from "@/lib/breakpoints";
import { books, firstSentence, getPassages } from "@/lib/content";
import { getProgress } from "@/lib/progress";
import { getReadPassages } from "@/lib/readPassages";
import { sketchSeenKey } from "@/lib/sketchSeen";
import { speak } from "@/lib/speech";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/speech", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/speech")>()),
  speak: vi.fn(),
}));
// nút "giải thích" mount AnnotationLayer → cần mock rough-notation (jsdom không vẽ SVG được)
vi.mock("rough-notation", () => ({
  annotate: () => ({ remove: () => {} }),
  annotationGroup: () => ({ show: () => {} }),
}));

const book = books[0];
const passages = getPassages(book.id, "ch01")!;
const outline = passages.map((p, i) => ({ index: i + 1, firstSentence: firstSentence(p.caption) }));
const chapterTitle = "Chương 1 · Don't Try";

function renderView() {
  return render(
    <PassageView
      outline={outline}
      chapterTitle={chapterTitle}
      book={book}
      chapterId="ch01"
      passage={passages[0]}
      passageIndex={1}
      passageCount={passages.length}
    />,
  );
}

function view2() {
  return (
    <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[1]} passageIndex={2} passageCount={passages.length} />
  );
}

describe("PassageView", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it("render đoạn mô tả và header thẻ", () => {
    renderView();
    expect(screen.getByTestId("caption-col").textContent).toContain("This is Charles Bukowski, and his life is a mess");
    expect(document.querySelector("header")!.textContent).toContain(`thẻ 1/${passages.length}`);
  });

  it("lưu tiến độ khi mở đoạn", () => {
    renderView();
    expect(getProgress()).toEqual({ bookId: book.id, chapterId: "ch01", passageIndex: 1 });
  });

  it("phím bất kỳ khi hình đang vẽ → hiện đủ mô tả + bản dịch ngay", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    expect(screen.getByTestId("translation-col").textContent).toContain("chưa bao giờ giả vờ làm một người khác");
  });

  it("không lùi được khi đang ở đoạn 1, enter đi tới đoạn 2", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(push).not.toHaveBeenCalled(); // đang ở đoạn 1, không lùi được
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("có 2 nút theme tìm được theo tên: header (mobile) và footer (desktop) — CSS ẩn một trong hai", () => {
    renderView();
    const buttons = screen.getAllByRole("button", { name: /theme/ });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].closest("header")).toBeTruthy();
    expect(buttons[1].closest("footer")).toBeTruthy();
  });

  it("nút '← trước' disabled ở đoạn 1, nút 'tiếp →' điều hướng sang đoạn 2", () => {
    renderView();
    const prev = screen.getByRole("button", { name: /← trước/ });
    expect(prev.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /tiếp →/ }));
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("hiện mẹo lần đầu; bấm nút 'giải thích' bật explain và ẩn mẹo", () => {
    renderView();
    expect(screen.getByText(/mẹo: bấm nút "giải thích"/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /giải thích/ }));
    expect(screen.getByText(/chunks đáng học/)).toBeTruthy();
    expect(screen.queryByText(/mẹo: bấm nút/)).toBeNull();
    expect(localStorage.getItem("tie:hint:reader")).toBe("1");
  });

  it("bấm 'đã hiểu' ẩn mẹo và lần sau không hiện lại", () => {
    const first = renderView();
    fireEvent.click(screen.getByRole("button", { name: "đã hiểu" }));
    expect(screen.queryByText(/mẹo: bấm nút/)).toBeNull();
    first.unmount();
    renderView();
    expect(screen.queryByText(/mẹo: bấm nút/)).toBeNull();
  });

  it("enter điều hướng sang đoạn kế tiếp khi còn đoạn phía sau", () => {
    render(
      <PassageView
        outline={outline}
        chapterTitle={chapterTitle}
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

  it("Enter trên một nút đang focus thì không chuyển đoạn, kể cả lúc đang gõ", () => {
    renderView();
    const btn = screen.getByRole("button", { name: /giải thích/ });
    const typingBefore = screen.getByTestId("translation-col").textContent;
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("translation-col").textContent).toBe(typingBefore); // không bỏ qua hiệu ứng gõ
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
  });

  it("bấm chuột vào nút xong thì nút nhả focus: Enter lại là phím sang đoạn", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    const btn = screen.getByRole("button", { name: /giải thích/ });
    btn.focus();
    fireEvent.click(btn, { detail: 1 }); // chuột: detail = số lần bấm
    expect(document.activeElement).not.toBe(btn);
    fireEvent.keyDown(document.activeElement ?? window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });

  it("nút được bấm bằng bàn phím (Enter/Space) thì giữ focus", () => {
    renderView();
    const btn = screen.getByRole("button", { name: /giải thích/ });
    btn.focus();
    fireEvent.click(btn, { detail: 0 }); // bàn phím: detail = 0
    expect(document.activeElement).toBe(btn);
  });

  it("Enter trên phần tử con của nút cũng tính là trên nút", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    const kbd = screen.getByRole("button", { name: /giải thích/ }).querySelector("kbd")!;
    fireEvent.keyDown(kbd, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
  });

  it("phím tắt khác trên nút đang focus vẫn chạy", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(screen.getByRole("button", { name: /tiếp →/ }), { key: "ArrowRight" });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("Shift+←/→ là để nới vùng chọn của trình duyệt: không chuyển đoạn", () => {
    render(view2());
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });
    expect(push).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/3");
  });

  it("đoạn 1 có hình phác thảo", () => {
    renderView();
    expect(screen.getByTestId("sketch")).toBeTruthy();
  });

  it("thẻ nào cũng có hình (sketch bắt buộc), nằm trước đoạn mô tả", () => {
    renderView();
    const sketch = screen.getByTestId("sketch");
    const caption = screen.getByTestId("caption-text");
    expect(sketch.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("mở thẻ chưa xem: mô tả + bản dịch chờ hình; phím bất kỳ (trừ Esc) → hiện đủ, chưa chuyển thẻ", () => {
    renderView();
    expect(screen.getByTestId("caption-waiting").textContent).toBe("đang vẽ…");
    expect(screen.getByTestId("caption-text").closest("[hidden]")).not.toBeNull();
    expect(screen.getByTestId("translation-waiting").textContent).toBe("bản dịch hiện sau khi vẽ xong.");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("caption-waiting")).not.toBeNull();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByTestId("caption-waiting")).toBeNull();
    expect(screen.getByTestId("caption-text").closest("[hidden]")).toBeNull();
    expect(screen.queryByText("đang gõ…")).toBeNull();
    expect(screen.getByTestId("credit").textContent).toBe(
      "Ý tưởng từ chương 1, The Subtle Art of Not Giving a F*ck — Mark Manson. Hình và lời: takeiteasy.",
    );
    expect(screen.getByTestId("sketch").dataset.state).toBe("done");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
  });
});

describe("PassageView — đọc to / Space lúc hình đang vẽ", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
    vi.mocked(speak).mockClear();
    vi.stubGlobal("speechSynthesis", { getVoices: () => [], cancel: () => {}, speak: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("bấm 'đọc to' lúc đang vẽ → hiện đủ mô tả + bản dịch rồi đọc mô tả", () => {
    renderView();
    expect(screen.queryByTestId("caption-waiting")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /đọc to/ }));
    expect(screen.queryByTestId("caption-waiting")).toBeNull();
    expect(screen.getByTestId("caption-text").closest("[hidden]")).toBeNull();
    expect(screen.queryByText("đang gõ…")).toBeNull();
    expect(speak).toHaveBeenCalledWith(passages[0].caption);
  });

  it("Space trên nút đang focus lúc đang vẽ → không bị preventDefault (nút tự bấm); Space ở ngoài nút thì có", () => {
    renderView();
    const btn = screen.getByRole("button", { name: /giải thích/ });
    const onBtn = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    act(() => void btn.dispatchEvent(onBtn));
    expect(onBtn.defaultPrevented).toBe(false);
    expect(screen.queryByTestId("caption-waiting")).toBeNull(); // vẫn hiện đủ

    cleanup();
    localStorage.clear(); // thẻ vừa hiện đủ đã tính là đã xem
    renderView();
    const onBody = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    act(() => void document.body.dispatchEvent(onBody));
    expect(onBody.defaultPrevented).toBe(true);
  });
});

describe("PassageView — HTML server (chưa biết thẻ đã xem chưa)", () => {
  beforeEach(() => localStorage.clear());

  it("dựng cả chỗ chờ lẫn nội dung đủ dưới [data-sketch-gate], kèm CSS chọn theo id thẻ", () => {
    const html = renderToString(
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[0]} passageIndex={1} passageCount={passages.length} />,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const gate = doc.querySelector('[data-testid="reader"][data-sketch-gate]')!;
    expect(gate).not.toBeNull();
    expect(gate.querySelector('[data-testid="caption-waiting"]')!.classList.contains("gate-wait")).toBe(true);
    expect(gate.querySelector('[data-testid="translation-waiting"]')!.classList.contains("gate-wait")).toBe(true);
    expect(gate.querySelector('[data-testid="caption-text"]')!.closest(".gate-full")).not.toBeNull();
    expect(gate.querySelector('[data-testid="caption-text"]')!.closest("[hidden]")).toBeNull();
    expect(gate.querySelector('[data-testid="credit"]')!.closest(".gate-full")).not.toBeNull();
    expect(gate.querySelector('[data-testid="sketch-art"]')!.getAttribute("class")).toBe("sketch-art-idle");
    expect(doc.querySelector("style")!.textContent).toContain(`[data-sketch-seen~="${passages[0].id}"]`);
  });

  it("sau khi mở ở client: hết trạng thái chưa biết (không còn gate / style)", () => {
    renderView();
    expect(document.querySelector("[data-sketch-gate]")).toBeNull();
    expect(document.querySelector("style")).toBeNull();
    expect(screen.queryByTestId("caption-waiting")).not.toBeNull();
    cleanup();
    localStorage.setItem(sketchSeenKey(passages[0].id), "1");
    renderView();
    expect(document.querySelector("[data-sketch-gate]")).toBeNull();
    expect(screen.queryByTestId("caption-waiting")).toBeNull();
    expect(screen.queryByTestId("translation-waiting")).toBeNull();
    expect(screen.getByTestId("credit")).toBeTruthy();
  });
});

describe("PassageView — phím lúc hình đang vẽ", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  const waiting = () => screen.queryByTestId("caption-waiting") !== null;
  const seen = () => localStorage.getItem(sketchSeenKey(passages[0].id));
  const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
    act(() => void target.dispatchEvent(ev));
    return ev;
  };

  it("danh sách thẻ đang mở: phím đi tới danh sách (g đóng, ↑↓ không hiện thẻ), không đánh dấu đã xem", () => {
    renderView();
    fireEvent.click(screen.getByTestId("jump-trigger"));
    expect(screen.queryByTestId("jump-list")).toBeTruthy();
    press("ArrowDown", {}, document.activeElement ?? document.body);
    press("x");
    expect(screen.queryByTestId("jump-list")).toBeTruthy();
    press("g");
    expect(screen.queryByTestId("jump-list")).toBeNull(); // g lần đầu đã đóng
    expect(waiting()).toBe(true);
    expect(screen.getByTestId("sketch").dataset.state).not.toBe("done");
    expect(seen()).toBeNull();
  });

  it("phím bổ trợ đứng một mình, tổ hợp Ctrl/Meta/Alt, F1–F12: bỏ qua hẳn (không hiện, không chặn)", () => {
    renderView();
    const evs = [
      press("Shift", { shiftKey: true }),
      press("Control", { ctrlKey: true }),
      press("Alt", { altKey: true }),
      press("Meta", { metaKey: true }),
      press("r", { ctrlKey: true }),
      press("r", { metaKey: true }),
      press("ArrowLeft", { altKey: true }),
      press("F5"),
      press("F1"),
      press("F12"),
    ];
    expect(evs.map((e) => e.defaultPrevented)).toEqual(evs.map(() => false));
    expect(waiting()).toBe(true);
    expect(seen()).toBeNull();
  });

  it("phím cuộn (PageUp/PageDown/↑/↓, Home ở thẻ đầu) không bị chặn và không hiện thẻ", () => {
    renderView();
    const evs = ["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home"].map((k) => press(k));
    expect(evs.map((e) => e.defaultPrevented)).toEqual(evs.map(() => false));
    expect(waiting()).toBe(true);
    expect(seen()).toBeNull();
  });

  it("phím tắt của app (→, End khi chưa ở thẻ cuối) vẫn hiện đủ + chặn, chưa chuyển thẻ", () => {
    renderView();
    expect(press("End").defaultPrevented).toBe(true);
    expect(waiting()).toBe(false);
    expect(push).not.toHaveBeenCalled();
    cleanup();
    localStorage.clear();
    renderView();
    expect(press("ArrowRight").defaultPrevented).toBe(true);
    expect(waiting()).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});

describe("PassageView — danh sách đoạn (g / Home / End)", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  const skipTyping = () => fireEvent.keyDown(window, { key: "x" });
  const list = () => screen.queryByTestId("jump-list");

  it("phím g mở danh sách, g lần nữa đóng", () => {
    renderView();
    skipTyping();
    fireEvent.keyDown(window, { key: "g" });
    expect(list()).toBeTruthy();
    expect(screen.getAllByTestId("jump-row")).toHaveLength(passages.length);
    expect(screen.getByText(chapterTitle)).toBeTruthy();
    fireEvent.keyDown(window, { key: "g" });
    expect(list()).toBeNull();
  });

  it("Home → router.push('/read/<book>/<ch>/1'); End → đoạn cuối", () => {
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "Home" });
    expect(push).toHaveBeenLastCalledWith("/read/the-subtle-art/ch01/1");
    fireEvent.keyDown(window, { key: "End" });
    expect(push).toHaveBeenLastCalledWith(`/read/the-subtle-art/ch01/${passages.length}`);
  });

  it("Home ở đoạn 1 / End ở đoạn cuối: không chuyển đoạn và không chặn phím cuộn của trình duyệt", () => {
    const { unmount } = renderView();
    skipTyping();
    const home = new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(home);
    });
    expect(push).not.toHaveBeenCalled();
    expect(home.defaultPrevented).toBe(false);
    unmount();
    render(
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[passages.length - 1]} passageIndex={passages.length} passageCount={passages.length} />,
    );
    skipTyping();
    const end = new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(end);
    });
    expect(push).not.toHaveBeenCalled();
    expect(end.defaultPrevented).toBe(false);
  });

  it("Shift+Home / Shift+End là để nới vùng chọn: không chuyển đoạn, không chặn phím", () => {
    render(view2());
    skipTyping();
    for (const key of ["Home", "End"]) {
      const ev = new KeyboardEvent("keydown", { key, shiftKey: true, bubbles: true, cancelable: true });
      act(() => {
        window.dispatchEvent(ev);
      });
      expect(ev.defaultPrevented).toBe(false);
    }
    expect(push).not.toHaveBeenCalled();
  });

  it("Home/End khi đích khác đoạn hiện tại thì vẫn chặn phím mặc định", () => {
    render(view2());
    skipTyping();
    const home = new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(home);
    });
    expect(home.defaultPrevented).toBe(true);
  });

  it("tấm giải thích đang mở: g/Home/End không làm gì", () => {
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.click(screen.getByTestId("mobile-notes").querySelector("button")!);
    expect(screen.getByRole("dialog")).toBeTruthy();
    for (const key of ["g", "Home", "End"]) fireEvent.keyDown(window, { key });
    expect(push).not.toHaveBeenCalled();
    expect(list()).toBeNull();
  });

  it("ngăn giải thích đang mở (desktop: footer vẫn bấm được) mà bấm bộ đếm → đóng ngăn, chỉ còn danh sách", () => {
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.click(screen.getByTestId("mobile-notes").querySelector("button")!);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("jump-trigger"));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(list()).toBeTruthy();
  });

  it("danh sách mở: ArrowRight/Enter/e/s không chuyển đoạn, không bật giải thích, không đọc to", () => {
    vi.mocked(speak).mockClear();
    render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "g" });
    for (const key of ["ArrowRight", "Enter", "e", "s", "ArrowLeft"]) fireEvent.keyDown(window, { key });
    expect(push).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    expect(screen.queryByText(/chunks đáng học/)).toBeNull();
    expect(list()).toBeTruthy();
  });

  it("danh sách mở + Escape: đóng danh sách nhưng không tắt chế độ giải thích phía sau", () => {
    renderView();
    skipTyping();
    fireEvent.keyDown(window, { key: "e" });
    fireEvent.keyDown(window, { key: "g" });
    // phím đi vào chỗ đang focus (dòng hiện tại trong danh sách) — danh sách tự lo Esc
    expect(list()!.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(list()).toBeNull();
    expect(screen.getByText(/chunks đáng học/)).toBeTruthy();
  });

  it("chọn một dòng → đóng danh sách và chuyển tới đoạn đó", () => {
    render(view2());
    skipTyping();
    fireEvent.click(screen.getByTestId("jump-trigger"));
    expect(screen.getByTestId("jump-trigger").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getAllByTestId("jump-row")[2]);
    expect(list()).toBeNull();
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/3");
  });

  it("chọn dòng 'đang đọc' → chỉ đóng danh sách, không đổi đoạn", () => {
    render(view2());
    skipTyping();
    fireEvent.click(screen.getByTestId("jump-trigger"));
    fireEvent.click(screen.getAllByTestId("jump-row")[1]);
    expect(list()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("mở đoạn thì ghi vào tie:read; danh sách hiện ✓ các đoạn đã mở", () => {
    const { rerender } = render(view2());
    expect(getReadPassages(book.id, "ch01")).toEqual([2]);
    rerender(
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[0]} passageIndex={1} passageCount={passages.length} />,
    );
    expect(getReadPassages(book.id, "ch01")).toEqual([1, 2]);
    skipTyping();
    fireEvent.click(screen.getByTestId("jump-trigger-mobile"));
    const rows = screen.getAllByTestId("jump-row");
    expect(rows.map((r) => r.textContent?.includes("✓"))).toEqual([true, true, false]);
  });

  it("đổi đoạn không qua danh sách (back/forward) thì danh sách đóng", () => {
    const { rerender } = render(view2());
    skipTyping();
    fireEvent.keyDown(window, { key: "g" });
    expect(list()).toBeTruthy();
    rerender(
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[0]} passageIndex={1} passageCount={passages.length} />,
    );
    expect(list()).toBeNull();
  });
});

// RF4: chuyển đoạn thì thanh/popup chọn chữ biến mất ngay, không mang chữ của đoạn cũ sang đoạn mới.
// PassageView sống tiếp qua rerender, như trên app thật (nằm ở layout của chương).
describe("PassageView — chọn chữ khi chuyển đoạn", () => {
  const original = Range.prototype.getBoundingClientRect;
  beforeAll(() => {
    Range.prototype.getBoundingClientRect = () =>
      ({ left: 40, top: 200, width: 120, height: 20, right: 160, bottom: 220, x: 40, y: 200, toJSON() {} }) as DOMRect;
  });
  afterAll(() => {
    Range.prototype.getBoundingClientRect = original;
  });
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.useRealTimers();
  });

  function view(i: number) {
    return (
      <PassageView outline={outline} chapterTitle={chapterTitle} book={book} chapterId="ch01" passage={passages[i - 1]} passageIndex={i} passageCount={passages.length} />
    );
  }

  /** Bôi đen "bets his rent money on horse" trong đoạn mô tả rồi chờ quá 250ms → popup hiện (jsdom không có matchMedia → desktop). */
  function selectBetsHorse() {
    const root = screen.getByTestId("caption-text");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    while (walker.nextNode()) {
      const t = walker.currentNode as Text;
      if (t.data.includes("bets his rent")) node = t;
      if (node) break;
    }
    // "bets his rent money on" là span cụm riêng; " horse races…" nằm ở text node kế tiếp
    const next = node!.parentNode!.nextSibling as Text;
    act(() => {
      const range = document.createRange();
      range.setStart(node!, 0);
      range.setEnd(next, " horse".length);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => void vi.advanceTimersByTime(300));
    expect(window.getSelection()!.toString()).toBe("bets his rent money on horse");
    expect(screen.getByTestId("selection-popup")).toBeTruthy();
  }

  it("bấm Enter sang đoạn kế (goTo) thì popup tắt ngay, vùng chọn bị bỏ", () => {
    render(view(1));
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    selectBetsHorse();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/read/the-subtle-art/ch01/2");
    expect(screen.queryByTestId("selection-popup")).toBeNull();
    expect(window.getSelection()!.toString()).toBe("");
  });

  it("Escape tắt popup và bỏ vùng chọn", () => {
    render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    selectBetsHorse();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("selection-popup")).toBeNull();
    expect(window.getSelection()!.toString()).toBe("");
  });

  it("bôi đen chữ trong ghi chú tay (ngoài đoạn mô tả nhưng cùng cột) → không có popup", () => {
    render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(window, { key: "e" }); // bật giải thích → hiện ghi chú tay
    const label = screen.getByTestId("mobile-notes").querySelector("li span:last-child")!.firstChild as Text;
    act(() => {
      const range = document.createRange();
      range.setStart(label, 0);
      range.setEnd(label, Math.min(5, label.data.length));
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => void vi.advanceTimersByTime(300));
    expect(window.getSelection()!.toString()).not.toBe("");
    expect(screen.queryByTestId("selection-popup")).toBeNull();
  });

  it("đổi đoạn không qua goTo (back/forward) thì đoạn mới không có popup của đoạn cũ", () => {
    const { rerender } = render(view(1));
    fireEvent.keyDown(window, { key: "x" });
    selectBetsHorse();
    rerender(view(2));
    expect(screen.getByTestId("caption-text").textContent).toContain("It’s three in the morning");
    expect(screen.queryByTestId("selection-popup")).toBeNull();
  });
});

// Tra nghĩa: cụm soạn sẵn → mở tấm giải thích; chữ khác → POST /api/lookup, thẻ hiện ngay trong popup.
describe("PassageView — tra nghĩa", () => {
  const original = Range.prototype.getBoundingClientRect;
  beforeAll(() => {
    Range.prototype.getBoundingClientRect = () =>
      ({ left: 40, top: 200, width: 120, height: 20, right: 160, bottom: 220, x: 40, y: 200, toJSON() {} }) as DOMRect;
  });
  afterAll(() => {
    Range.prototype.getBoundingClientRect = original;
  });
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Bôi đen `needle` (nằm trọn trong một text node của đoạn mô tả) rồi chờ quá 250ms → popup / thanh hiện. */
  function selectWord(needle: string, ui = "selection-popup") {
    const root = screen.getByTestId("caption-text");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    while (walker.nextNode()) {
      const t = walker.currentNode as Text;
      if (new RegExp(`\\b${needle}\\b`).test(t.data)) {
        node = t;
        break;
      }
    }
    const at = node!.data.search(new RegExp(`\\b${needle}\\b`));
    act(() => {
      const range = document.createRange();
      range.setStart(node!, at);
      range.setEnd(node!, at + needle.length);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    act(() => void vi.advanceTimersByTime(300));
    expect(window.getSelection()!.toString()).toBe(needle);
    expect(screen.getByTestId(ui)).toBeTruthy();
  }

  const result = (headword: string) => ({
    status: "ok" as const,
    result: { headword, ipa: "/x/", pos: "danh từ", meaning: `nghĩa của ${headword}`, example: { en: `A ${headword}.`, vi: "Một ví dụ." } },
  });
  /** `fetch` giả: mỗi lượt treo tới khi test gọi `resolve` của lượt đó. */
  function deferredFetch() {
    const calls: { body: Record<string, unknown>; resolve: (body: unknown) => void }[] = [];
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise<Response>((res) => {
          calls.push({
            body: JSON.parse(init!.body as string),
            resolve: (body) => res({ status: 200, json: async () => body } as Response),
          });
        }),
    );
    return { calls, spy };
  }

  it("tra nghĩa trên 'mess' mở tấm giải thích, không fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderView();
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    selectWord("mess");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(screen.getByRole("dialog").textContent).toContain("be a mess");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("lookup-card")).toBeNull();
  });

  it("tra nghĩa trên 'Bukowski' → khung xương rồi thẻ kết quả; gửi đúng sách/đoạn/câu", async () => {
    const { calls } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(screen.getByTestId("selection-popup").contains(screen.getByTestId("lookup-skeleton"))).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ bookId: book.id, chapterId: "ch01", passageIndex: 1, text: "Bukowski" });
    const p1 = getPassages(book.id, "ch01")![0].caption;
    const { start, end } = calls[0].body as { start: number; end: number };
    expect(p1.slice(start, end)).toBe("Bukowski");
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.getByTestId("lookup-card").textContent).toContain("nghĩa của Bukowski");
    expect(screen.queryByTestId("lookup-skeleton")).toBeNull();
  });

  it("API lỗi → thẻ báo 'Tạm chưa tra được'", async () => {
    const { calls } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    await act(async () => calls[0].resolve({ status: "unavailable", reason: "paused" }));
    expect(screen.getByTestId("lookup-card").textContent).toContain("Tạm chưa tra được, thử lại sau nhé.");
  });

  it("bôi đen chữ khác khi đang chờ → phản hồi cũ không hiện", async () => {
    const { calls } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(screen.getByTestId("lookup-skeleton")).toBeTruthy();
    selectWord("drinks");
    expect(screen.queryByTestId("lookup-card")).toBeNull(); // thẻ thuộc vùng chọn cũ
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(calls).toHaveLength(2);
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.getByTestId("lookup-card").textContent).not.toContain("Bukowski");
    expect(screen.getByTestId("lookup-skeleton")).toBeTruthy();
    await act(async () => calls[1].resolve(result("drinks")));
    expect(screen.getByTestId("lookup-card").textContent).toContain("nghĩa của drinks");
  });

  it("bôi đen chữ khác (không bấm tra) rồi phản hồi cũ về → không có thẻ", async () => {
    const { calls } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    selectWord("drinks");
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
  });

  it("Escape đóng thẻ cùng vùng chọn", async () => {
    const { calls } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.getByTestId("lookup-card")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(screen.queryByTestId("selection-popup")).toBeNull();
  });

  it("chuyển đoạn khi đang chờ → huỷ request, đoạn mới không có thẻ", async () => {
    const { calls, spy } = deferredFetch();
    const { rerender } = renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    const signal = spy.mock.calls[0][1]!.signal!;
    expect(signal.aborted).toBe(false);
    rerender(view2());
    expect(signal.aborted).toBe(true);
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
  });

  it("bấm 'tra nghĩa' lần nữa khi thẻ đang mở → đóng thẻ (không tra lại); lần thứ ba → tra lại", async () => {
    const { calls } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    const btn = () => screen.getByRole("button", { name: /tra nghĩa/ });
    fireEvent.click(btn());
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(btn().getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(btn());
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(btn().getAttribute("aria-expanded")).toBe("false");
    expect(calls).toHaveLength(1);
    expect(screen.getByTestId("selection-popup")).toBeTruthy(); // vùng chọn vẫn còn
    fireEvent.click(btn());
    expect(calls).toHaveLength(2);
    await act(async () => calls[1].resolve(result("Bukowski")));
    expect(screen.getByTestId("lookup-card").textContent).toContain("nghĩa của Bukowski");
  });

  it("bấm 'tra nghĩa' lần nữa khi đang chờ → đóng thẻ, huỷ request, phản hồi về muộn bị bỏ qua", async () => {
    const { calls, spy } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(screen.getByTestId("lookup-skeleton")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(spy.mock.calls[0][1]!.signal!.aborted).toBe(true);
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
  });

  it("popup: ✕ 'đóng thẻ' khi đang chờ → thẻ đóng, huỷ request, popup vẫn còn", async () => {
    const { calls, spy } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    fireEvent.click(screen.getByRole("button", { name: "đóng thẻ" }));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(spy.mock.calls[0][1]!.signal!.aborted).toBe(true);
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(screen.getByTestId("selection-popup")).toBeTruthy();
  });

  it("thanh đáy: ✕ 'đóng thẻ' khi đang chờ → thẻ đóng, phản hồi về sau không mở lại", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === DOCK_QUERY, addEventListener() {}, removeEventListener() {} }));
    const { calls, spy } = deferredFetch();
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    selectWord("Bukowski", "selection-dock");
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(screen.getByTestId("selection-dock").contains(screen.getByTestId("lookup-skeleton"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "đóng thẻ" }));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(spy.mock.calls[0][1]!.signal!.aborted).toBe(true);
    await act(async () => calls[0].resolve(result("Bukowski")));
    expect(screen.queryByTestId("lookup-card")).toBeNull();
    expect(screen.getByTestId("selection-dock")).toBeTruthy(); // vùng chọn vẫn còn, chỉ thẻ đóng
  });
});
