import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef, useLayoutEffect } from "react";
import { PassageSketch, type SketchHandle } from "@/components/reader/PassageSketch";
import type { Sketch } from "@/content/types";

const sketch: Sketch = {
  viewBox: "0 0 480 330",
  alt: "Phác thảo: một người que và chữ hello",
  steps: [
    { kind: "path", d: "M10,10 L100,100", tone: "line", seed: 3 },
    { kind: "text", text: "hello", x: 20, y: 40, size: 20, tone: "ink" },
    { kind: "pause", ms: 300 },
  ],
};

const SVG_STUBS = ["getBBox", "getTotalLength", "getPointAtLength"] as const;

function stubSvgMeasure() {
  const proto = SVGElement.prototype as unknown as Record<string, unknown>;
  proto.getBBox = vi.fn(() => ({ x: 20, y: 25, width: 50, height: 20 }));
  proto.getTotalLength = vi.fn(() => 120);
  proto.getPointAtLength = vi.fn((l: number) => ({ x: l, y: l }));
}

function removeSvgStubs() {
  const proto = SVGElement.prototype as unknown as Record<string, unknown>;
  for (const k of SVG_STUBS) delete proto[k];
}

/** chạy timer giả + flush promise (fonts.ready, ...) trong act */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const sketchEl = () => screen.getByTestId("sketch");

class FakeObserver {
  static all: FakeObserver[] = [];
  disconnected = false;
  target: Element | null = null;
  constructor(
    private cb: (entries: { intersectionRatio: number }[]) => void,
    public options: { threshold: number },
  ) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.target = el;
  }
  disconnect() {
    this.disconnected = true;
  }
  /** Trình duyệt báo tỉ lệ đang hiện của hình */
  report(intersectionRatio: number) {
    act(() => this.cb([{ intersectionRatio }]));
  }
}
const lastObserver = () => FakeObserver.all[FakeObserver.all.length - 1];

describe("PassageSketch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    stubSvgMeasure();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    removeSvgStubs();
  });

  it("mở thẻ chưa xem → waiting, tự vẽ sau 450ms, không chữ chờ bản dịch", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    expect(sketchEl().dataset.state).toBe("waiting");
    expect(screen.queryByText("chờ bản dịch gõ xong…")).toBeNull();
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
  });

  it("đã xem rồi → done ngay, không bút chì, có nút vẽ lại", () => {
    localStorage.setItem("tie:sketch-seen:p", "1");
    render(<PassageSketch sketch={sketch} passageId="p" />);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(screen.getByRole("button", { name: "↻ vẽ lại" })).toBeTruthy();
  });

  it("reduced motion → done, không có nút vẽ lại", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PassageSketch sketch={sketch} passageId="p" />);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(screen.queryByRole("button", { name: "↻ vẽ lại" })).toBeNull();
  });

  it("Sau 450ms thì vẽ, bấm xem ngay → done + nhớ đã xem", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(449);
    expect(sketchEl().dataset.state).toBe("waiting");
    await advance(1);
    expect(sketchEl().dataset.state).toBe("drawing");
    expect(screen.getByTestId("sketch-pencil")).toBeTruthy();
    expect(screen.getByText("đang vẽ…")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "xem ngay ⏭" }));
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(localStorage.getItem("tie:sketch-seen:p")).toBe("1");
  });

  it("bấm vào hình khi đang vẽ → done; bấm khi done thì không gì", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    fireEvent.click(screen.getByRole("img"));
    expect(sketchEl().dataset.state).toBe("done");
    fireEvent.click(screen.getByRole("img"));
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("vẽ hết tự nhiên → done, bút chì ẩn, nhớ đã xem", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
    await advance(7000);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(localStorage.getItem("tie:sketch-seen:p")).toBe("1");
  });

  it("đang vẽ: nét có dash, bút chì di chuyển; xong thì nét đủ", async () => {
    const { container } = render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    const path = container.querySelector("path")!;
    expect(path.style.strokeDasharray).toBe("122 122");
    const pencil = screen.getByTestId("sketch-pencil");
    const at0 = pencil.getAttribute("transform");
    await advance(1500); // chuyến đi đầu chiếm ~1s vì hình thử chỉ có vài nét ngắn
    expect(pencil.getAttribute("transform")).not.toBe(at0);
    expect(Number(path.style.strokeDashoffset)).toBeLessThan(122);
    await advance(7000);
    expect(path.style.strokeDasharray).toBe("");
  });

  it("một bước nhiều subpath: thành nhiều <path>, vẽ lần lượt theo độ dài cộng dồn, vẫn là một bước", async () => {
    const multi: Sketch = {
      viewBox: "0 0 480 330",
      alt: "hai nét",
      steps: [{ kind: "path", d: "M0,0 L100,0 M0,10 L100,10", tone: "line", plain: true }],
    };
    const { container } = render(<PassageSketch sketch={multi} passageId="p" />);
    await advance(450);
    const paths = Array.from(container.querySelectorAll("path"));
    expect(paths.map((p) => p.getAttribute("d"))).toEqual(["M0,0 L100,0", "M0,10 L100,10"]);
    expect(paths.map((p) => p.dataset.step)).toEqual(["0-0", "0-0"]);
    expect(paths.map((p) => p.style.strokeDashoffset)).toEqual(["122", "122"]);

    const state = () => paths.map((p) => Number(p.style.strokeDashoffset));
    // chỉ có một bước nên bước đó kéo dài gần hết 6s: đoạn đầu dở khi đoạn sau còn ẩn, rồi ngược lại
    await advance(2500);
    const [a0, b0] = state();
    expect(a0).toBeGreaterThan(2);
    expect(a0).toBeLessThan(122);
    expect(b0).toBe(122);
    await advance(1500);
    const [a1, b1] = state();
    expect(a1).toBe(0);
    expect(b1).toBeLessThan(122);
    expect(b1).toBeGreaterThan(0);
    await advance(2200);
    expect(sketchEl().dataset.state).toBe("done");
    expect(paths.map((p) => p.style.strokeDasharray)).toEqual(["", ""]);
  });

  it("done → bấm vẽ lại → drawing", async () => {
    localStorage.setItem("tie:sketch-seen:p", "1");
    render(<PassageSketch sketch={sketch} passageId="p" />);
    fireEvent.click(screen.getByRole("button", { name: "↻ vẽ lại" }));
    expect(sketchEl().dataset.state).toBe("drawing");
    expect(screen.getByTestId("sketch-pencil")).toBeTruthy();
  });

  it("xem ngay và vẽ lại là cùng một nút: bấm bằng bàn phím xong focus vẫn ở nút", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    const btn = screen.getByRole("button", { name: "xem ngay ⏭" });
    btn.focus();
    fireEvent.click(btn);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.getByRole("button", { name: "↻ vẽ lại" })).toBe(btn);
    expect(document.activeElement).toBe(btn);
    fireEvent.click(btn);
    expect(sketchEl().dataset.state).toBe("drawing");
    expect(screen.getByRole("button", { name: "xem ngay ⏭" })).toBe(btn);
  });

  it("bút chì không nhận chuột: bấm trúng chỗ bút là bấm vào thứ nằm dưới nó", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    expect(screen.getByTestId("sketch-pencil").getAttribute("class")).toContain("pointer-events-none");
  });

  it("vòng khoanh nhiều vòng (cú chốt) vẽ đúng 1200ms ở cuối, không bị co theo tổng", async () => {
    const ring: Sketch = {
      ...sketch,
      steps: [
        { kind: "path", d: "M10,10 L100,100", tone: "line", seed: 3 },
        { kind: "ellipse", cx: 200, cy: 150, w: 120, h: 160, tone: "ink", seed: 21, multi: true },
      ],
    };
    const { container } = render(<PassageSketch sketch={ring} passageId="p" />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
    const first = () => container.querySelector<SVGPathElement>('path[data-step="1-0"]')!;
    const off = () => parseFloat(first().style.strokeDashoffset);
    const dash = parseFloat(first().style.strokeDasharray);
    await advance(6000 - 1200 - 100);
    expect(off()).toBeCloseTo(dash); // chưa tới lượt
    await advance(400);
    expect(off()).toBeGreaterThan(0);
    expect(off()).toBeLessThan(dash);
    await advance(1000);
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("svg role=img, tên đúng bằng alt", () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    expect(screen.getByRole("img", { name: sketch.alt })).toBeTruthy();
  });

  it("dimmed → mờ đi", () => {
    render(<PassageSketch sketch={sketch} passageId="p" dimmed />);
    expect(sketchEl().className).toContain("opacity-30");
  });

  it("chờ font tay tải xong (tối đa 1500ms) rồi mới đo và vẽ", async () => {
    Object.defineProperty(document, "fonts", {
      value: { ready: new Promise(() => {}) },
      configurable: true,
    });
    try {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      await advance(450);
      expect(sketchEl().dataset.state).toBe("waiting");
      await advance(1500);
      expect(sketchEl().dataset.state).toBe("drawing");
    } finally {
      delete (document as unknown as Record<string, unknown>).fonts;
    }
  });

  it("thiếu getTotalLength/getBBox (Review Focus 1) → không ném lỗi, vẫn vẽ xong", async () => {
    removeSvgStubs();
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
    await advance(7000);
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("đo hình bị lỗi (getBBox ném): hiện đủ hình thay vì ẩn mãi, không có lời hứa bị bỏ rơi", async () => {
    const rejections: unknown[] = [];
    const onRejection = (e: unknown) => rejections.push(e);
    process.on("unhandledRejection", onRejection);
    try {
      (SVGElement.prototype as unknown as Record<string, unknown>).getBBox = vi.fn(() => {
        throw new Error("InvalidStateError");
      });
      const { container } = render(<PassageSketch sketch={sketch} passageId="p" />);
      await advance(450);
      expect(sketchEl().dataset.state).toBe("done");
      expect(screen.queryByTestId("sketch-pencil")).toBeNull();
      expect(screen.getByTestId("sketch-art").style.opacity).toBe("");
      expect(screen.queryByText("đang vẽ…")).toBeNull();
      // nét đã kịp đặt dash trước khi đo chữ ném lỗi cũng phải được trả lại nguyên vẹn
      const path = container.querySelector("path")!;
      expect(path.style.strokeDasharray).toBe("");
      expect(path.style.strokeDashoffset).toBe("");
      // chưa vẽ được lần nào thì chưa tính là đã xem — lần sau (trình duyệt khác, hết lỗi) vẫn được xem vẽ
      expect(localStorage.getItem("tie:sketch-seen:p")).toBeNull();
      await advance(0);
      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });

  it("vẽ lại mà đo bị lỗi: vẫn ở done, hình đủ", () => {
    localStorage.setItem("tie:sketch-seen:p", "1");
    (SVGElement.prototype as unknown as Record<string, unknown>).getBBox = vi.fn(() => {
      throw new Error("InvalidStateError");
    });
    render(<PassageSketch sketch={sketch} passageId="p" />);
    fireEvent.click(screen.getByRole("button", { name: "↻ vẽ lại" }));
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("localStorage bị chặn (Review Focus 4) → vẫn vẽ, xem ngay không ném lỗi", async () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    vi.spyOn(proto, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(proto, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<PassageSketch sketch={sketch} passageId="p" />);
    expect(sketchEl().dataset.state).toBe("waiting");
    await advance(450);
    fireEvent.click(screen.getByRole("button", { name: "xem ngay ⏭" }));
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("unmount khi đang vẽ → không lỗi console, không còn timer/rAF treo", async () => {
    const err = vi.spyOn(console, "error");
    const { unmount } = render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance(10000);
    expect(err).not.toHaveBeenCalled();
  });

  it("unmount khi đang chờ delay → huỷ timeout", async () => {
    const err = vi.spyOn(console, "error");
    const { unmount } = render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(100);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance(10000);
    expect(err).not.toHaveBeenCalled();
  });

  describe("chỉ vẽ khi hình đã lọt vào màn hình", () => {
    const SCROLL = "cuộn tới hình để xem vẽ…";

    beforeEach(() => {
      FakeObserver.all = [];
      vi.stubGlobal("IntersectionObserver", FakeObserver);
    });

    it("mở thẻ: quan sát svg với ngưỡng 90%; chưa có kết quả đo thì chưa hiện chữ gì", () => {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      expect(lastObserver().options.threshold).toBe(0.9);
      expect(lastObserver().target).toBe(screen.getByRole("img"));
      expect(screen.queryByText(SCROLL)).toBeNull();
    });

    it("hình chưa lọt màn hình: đợi mãi, báo cuộn xuống, chưa tính là đã xem", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      lastObserver().report(0);
      expect(screen.getByText(SCROLL)).toBeTruthy();
      await advance(10000);
      expect(sketchEl().dataset.state).toBe("waiting");
      expect(screen.queryByTestId("sketch-pencil")).toBeNull();
      expect(localStorage.getItem("tie:sketch-seen:p")).toBeNull();
    });

    it("chỉ hiện một phần (dưới 90%) thì vẫn chưa vẽ", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      lastObserver().report(0.5);
      await advance(1000);
      expect(sketchEl().dataset.state).toBe("waiting");
      expect(screen.getByText(SCROLL)).toBeTruthy();
    });

    it("cuộn tới: 450ms tính từ lúc đủ 2 điều kiện, không hiện chữ gì trong lúc chờ, ngắt quan sát", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      lastObserver().report(0);
      await advance(3000);
      lastObserver().report(0.95);
      expect(lastObserver().disconnected).toBe(true);
      expect(screen.queryByText(SCROLL)).toBeNull();
      await advance(449);
      expect(sketchEl().dataset.state).toBe("waiting");
      await advance(1);
      expect(sketchEl().dataset.state).toBe("drawing");
    });

    it("ngay trước khi vẽ mà hình đã bị cuộn khỏi màn hình: chưa vẽ, chưa tính đã xem, quan sát lại; cuộn tới thì vẽ", async () => {
      const rect = vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 400, height: 300 } as DOMRect);
      render(<PassageSketch sketch={sketch} passageId="p" />);
      lastObserver().report(1);
      await advance(200);
      rect.mockReturnValue({ top: -600, bottom: -300, height: 300 } as DOMRect); // lướt qua rồi cuộn đi tiếp
      await advance(250);
      expect(sketchEl().dataset.state).toBe("waiting");
      expect(screen.getByText(SCROLL)).toBeTruthy();
      expect(localStorage.getItem("tie:sketch-seen:p")).toBeNull();
      expect(FakeObserver.all).toHaveLength(2);
      expect(lastObserver().disconnected).toBe(false);

      rect.mockReturnValue({ top: 100, bottom: 400, height: 300 } as DOMRect);
      lastObserver().report(1);
      await advance(450);
      expect(sketchEl().dataset.state).toBe("drawing");
    });

    it("đã bắt đầu vẽ thì cuộn đi cũng không dừng; báo của trình duyệt sau khi đã thấy thì bỏ qua", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      const io = lastObserver();
      io.report(1);
      await advance(100);
      io.report(0);
      await advance(350);
      expect(sketchEl().dataset.state).toBe("drawing");
      io.report(0);
      await advance(7000);
      expect(sketchEl().dataset.state).toBe("done");
      expect(FakeObserver.all).toHaveLength(1);
    });

    it("unmount khi đang chờ thì ngắt quan sát", () => {
      const { unmount } = render(<PassageSketch sketch={sketch} passageId="p" />);
      const io = lastObserver();
      expect(io.disconnected).toBe(false);
      unmount();
      expect(io.disconnected).toBe(true);
    });

    it("cửa sổ quá thấp, không bao giờ chứa nổi 90% hình: hạ ngưỡng theo phần cửa sổ chứa được", () => {
      vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 1536 } as DOMRect);
      render(<PassageSketch sketch={sketch} passageId="p" />); // jsdom: innerHeight = 768
      expect(lastObserver().options.threshold).toBeCloseTo(0.45);
    });

    it("đã xem hoặc giảm chuyển động: không cần quan sát, hiện sẵn", () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      render(<PassageSketch sketch={sketch} passageId="p" />);
      expect(sketchEl().dataset.state).toBe("done");
      expect(FakeObserver.all).toHaveLength(0);
    });

    it("vẽ lại không cần chờ lọt màn hình", () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      render(<PassageSketch sketch={sketch} passageId="p" />);
      fireEvent.click(screen.getByRole("button", { name: "↻ vẽ lại" }));
      expect(sketchEl().dataset.state).toBe("drawing");
      expect(FakeObserver.all).toHaveLength(0);
    });
  });

  it("trình duyệt không có IntersectionObserver: coi như đã thấy, vẽ sau 450ms", async () => {
    expect("IntersectionObserver" in window).toBe(false);
    render(<PassageSketch sketch={sketch} passageId="p" />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
  });

  describe("báo xong cho trang đọc (onDone) và finish()", () => {
    it("đã xem → onDone('instant') đúng một lần, không vẽ", async () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      expect(sketchEl().dataset.state).toBe("done");
      expect(onDone.mock.calls).toEqual([["instant"]]);
      await advance(10000);
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    });

    it("reduced-motion → onDone('instant')", () => {
      vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      expect(onDone.mock.calls).toEqual([["instant"]]);
    });

    it("chưa xem: chưa báo gì cho tới khi vẽ xong → onDone('animate') một lần", async () => {
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      await advance(450);
      expect(sketchEl().dataset.state).toBe("drawing");
      expect(onDone).not.toHaveBeenCalled();
      await advance(7000);
      expect(onDone.mock.calls).toEqual([["animate"]]);
    });

    it("bấm 'xem ngay ⏭' khi đang vẽ → onDone('animate')", async () => {
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      await advance(450);
      fireEvent.click(screen.getByRole("button", { name: "xem ngay ⏭" }));
      expect(onDone.mock.calls).toEqual([["animate"]]);
    });

    it("bấm vào hình khi đang vẽ → onDone('animate')", async () => {
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      await advance(450);
      fireEvent.click(screen.getByRole("img"));
      expect(onDone.mock.calls).toEqual([["animate"]]);
    });

    it("đo lỗi → hiện đủ hình, onDone('animate'), chưa tính đã xem", async () => {
      (SVGElement.prototype as unknown as Record<string, unknown>).getBBox = vi.fn(() => {
        throw new Error("InvalidStateError");
      });
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      await advance(450);
      expect(sketchEl().dataset.state).toBe("done");
      expect(onDone.mock.calls).toEqual([["animate"]]);
      expect(localStorage.getItem("tie:sketch-seen:p")).toBeNull();
    });

    it("ref.finish() khi đang chờ → done, đã xem, onDone('animate')", async () => {
      const ref = createRef<SketchHandle>();
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} ref={ref} />);
      expect(sketchEl().dataset.state).toBe("waiting");
      act(() => ref.current!.finish());
      expect(sketchEl().dataset.state).toBe("done");
      expect(localStorage.getItem("tie:sketch-seen:p")).toBe("1");
      expect(onDone.mock.calls).toEqual([["animate"]]);
      expect(screen.getByTestId("sketch-art").style.opacity).toBe("");
      await advance(10000); // timer chờ đã bị huỷ, không tự vẽ nữa
      expect(sketchEl().dataset.state).toBe("done");
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it("ref.finish() khi đang vẽ → done, onDone('animate')", async () => {
      const ref = createRef<SketchHandle>();
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} ref={ref} />);
      await advance(450);
      act(() => ref.current!.finish());
      expect(sketchEl().dataset.state).toBe("done");
      expect(onDone.mock.calls).toEqual([["animate"]]);
    });

    it("ref.finish() khi đã done → không gọi onDone lần nữa; gọi hai lần liền cũng chỉ báo một lần", async () => {
      const ref = createRef<SketchHandle>();
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} ref={ref} />);
      act(() => {
        ref.current!.finish();
        ref.current!.finish();
      });
      expect(onDone).toHaveBeenCalledTimes(1);
      act(() => ref.current!.finish());
      expect(onDone).toHaveBeenCalledTimes(1);

      localStorage.clear();
      const ref2 = createRef<SketchHandle>();
      const onDone2 = vi.fn();
      localStorage.setItem("tie:sketch-seen:q", "1");
      render(<PassageSketch sketch={sketch} passageId="q" onDone={onDone2} ref={ref2} />);
      act(() => ref2.current!.finish());
      expect(onDone2.mock.calls).toEqual([["instant"]]);
    });

    it("finish() chạy trước effect mở thẻ (người trên gọi trong layout effect) → giữ done, chỉ báo 'animate'", async () => {
      const ref = createRef<SketchHandle>();
      const onDone = vi.fn();
      function Parent() {
        // layout effect của cha chạy sau khi ref được gắn nhưng trước passive effect mở thẻ của con
        useLayoutEffect(() => ref.current!.finish(), []);
        return <PassageSketch sketch={sketch} passageId="p" onDone={onDone} ref={ref} />;
      }
      render(<Parent />);
      expect(sketchEl().dataset.state).toBe("done");
      expect(onDone.mock.calls).toEqual([["animate"]]);
      await advance(10000);
      expect(sketchEl().dataset.state).toBe("done");
      expect(onDone.mock.calls).toEqual([["animate"]]);
    });

    it("vẽ lại → vẽ xong lại gọi onDone('animate')", async () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      const onDone = vi.fn();
      render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      fireEvent.click(screen.getByRole("button", { name: "↻ vẽ lại" }));
      expect(onDone.mock.calls).toEqual([["instant"]]);
      await advance(7000);
      expect(onDone.mock.calls).toEqual([["instant"], ["animate"]]);
    });

    it("onDone đổi giữa chừng → gọi bản mới nhất, không gọi bản cũ", async () => {
      const a = vi.fn();
      const b = vi.fn();
      const { rerender } = render(<PassageSketch sketch={sketch} passageId="p" onDone={a} />);
      await advance(450);
      rerender(<PassageSketch sketch={sketch} passageId="p" onDone={b} />);
      await advance(7000);
      expect(a).not.toHaveBeenCalled();
      expect(b.mock.calls).toEqual([["animate"]]);
    });

    it("đổi passageId (không remount) sang thẻ đã xem → báo 'instant' cho thẻ mới", () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      localStorage.setItem("tie:sketch-seen:q", "1");
      const onDone = vi.fn();
      const { rerender } = render(<PassageSketch sketch={sketch} passageId="p" onDone={onDone} />);
      rerender(<PassageSketch sketch={sketch} passageId="q" onDone={onDone} />);
      expect(onDone.mock.calls).toEqual([["instant"], ["instant"]]);
    });

    it("không truyền onDone / ref cũng không lỗi", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" />);
      await advance(450);
      fireEvent.click(screen.getByRole("img"));
      expect(sketchEl().dataset.state).toBe("done");
    });
  });

  it("chữ trong hình có viền nền paint-order stroke", () => {
    const { container } = render(<PassageSketch sketch={sketch} passageId="p" />);
    const text = container.querySelector("text")!;
    expect(text.getAttribute("class")).toContain("stroke-bg");
    expect(text.getAttribute("class")).toContain("[paint-order:stroke]");
    expect(text.getAttribute("stroke-width")).toBe("4");
    expect(text.getAttribute("stroke-linejoin")).toBe("round");
  });

  it("nhãn đầu khối là '// hình', không còn margin-top", () => {
    render(<PassageSketch sketch={sketch} passageId="p" />);
    expect(screen.getByText("// hình")).toBeTruthy();
    expect(screen.queryByText("// phác thảo")).toBeNull();
    expect(sketchEl().className).not.toContain("mt-9");
  });
});
