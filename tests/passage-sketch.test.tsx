import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PassageSketch } from "@/components/reader/PassageSketch";
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

  it("start=false → waiting, có chữ chờ bản dịch", () => {
    render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
    expect(sketchEl().dataset.state).toBe("waiting");
    expect(screen.getByText("chờ bản dịch gõ xong…")).toBeTruthy();
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
  });

  it("đã xem rồi → done ngay, không bút chì, có nút vẽ lại", () => {
    localStorage.setItem("tie:sketch-seen:p", "1");
    render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(screen.getByRole("button", { name: "↻ vẽ lại" })).toBeTruthy();
  });

  it("reduced motion → done, không có nút vẽ lại", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(screen.queryByRole("button", { name: "↻ vẽ lại" })).toBeNull();
  });

  it("start=true → sau 450ms thì vẽ, bấm xem ngay → done + nhớ đã xem", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
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
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    await advance(450);
    fireEvent.click(screen.getByRole("img"));
    expect(sketchEl().dataset.state).toBe("done");
    fireEvent.click(screen.getByRole("img"));
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("vẽ hết tự nhiên → done, bút chì ẩn, nhớ đã xem", async () => {
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
    await advance(7000);
    expect(sketchEl().dataset.state).toBe("done");
    expect(screen.queryByTestId("sketch-pencil")).toBeNull();
    expect(localStorage.getItem("tie:sketch-seen:p")).toBe("1");
  });

  it("đang vẽ: nét có dash, bút chì di chuyển; xong thì nét đủ", async () => {
    const { container } = render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    await advance(450);
    const path = container.querySelector("path")!;
    expect(path.style.strokeDasharray).toBe("122 122");
    const pencil = screen.getByTestId("sketch-pencil");
    const at0 = pencil.getAttribute("transform");
    await advance(1000);
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
    const { container } = render(<PassageSketch sketch={multi} passageId="p" start={true} />);
    await advance(450);
    const paths = Array.from(container.querySelectorAll("path"));
    expect(paths.map((p) => p.getAttribute("d"))).toEqual(["M0,0 L100,0", "M0,10 L100,10"]);
    expect(paths.map((p) => p.dataset.step)).toEqual(["0-0", "0-0"]);
    expect(paths.map((p) => p.style.strokeDashoffset)).toEqual(["122", "122"]);

    const state = () => paths.map((p) => Number(p.style.strokeDashoffset));
    // chỉ có một bước nên bước đó kéo dài gần hết 5,6s: đoạn đầu dở khi đoạn sau còn ẩn, rồi ngược lại
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
    await advance(2000);
    expect(sketchEl().dataset.state).toBe("done");
    expect(paths.map((p) => p.style.strokeDasharray)).toEqual(["", ""]);
  });

  it("done → bấm vẽ lại → drawing", async () => {
    localStorage.setItem("tie:sketch-seen:p", "1");
    render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
    fireEvent.click(screen.getByRole("button", { name: "↻ vẽ lại" }));
    expect(sketchEl().dataset.state).toBe("drawing");
    expect(screen.getByTestId("sketch-pencil")).toBeTruthy();
  });

  it("svg role=img, tên đúng bằng alt", () => {
    render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
    expect(screen.getByRole("img", { name: sketch.alt })).toBeTruthy();
  });

  it("dimmed → mờ đi", () => {
    render(<PassageSketch sketch={sketch} passageId="p" start={false} dimmed />);
    expect(sketchEl().className).toContain("opacity-30");
  });

  it("chờ font tay tải xong (tối đa 1500ms) rồi mới đo và vẽ", async () => {
    Object.defineProperty(document, "fonts", {
      value: { ready: new Promise(() => {}) },
      configurable: true,
    });
    try {
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
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
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
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
      const { container } = render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      await advance(450);
      expect(sketchEl().dataset.state).toBe("done");
      expect(screen.queryByTestId("sketch-pencil")).toBeNull();
      expect(screen.getByTestId("sketch-art").style.opacity).toBe("");
      expect(screen.queryByText("đang vẽ…")).toBeNull();
      // nét đã kịp đặt dash trước khi đo chữ ném lỗi cũng phải được trả lại nguyên vẹn
      const path = container.querySelector("path")!;
      expect(path.style.strokeDasharray).toBe("");
      expect(path.style.strokeDashoffset).toBe("");
      expect(localStorage.getItem("tie:sketch-seen:p")).toBe("1");
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
    render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
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
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    expect(sketchEl().dataset.state).toBe("waiting");
    await advance(450);
    fireEvent.click(screen.getByRole("button", { name: "xem ngay ⏭" }));
    expect(sketchEl().dataset.state).toBe("done");
  });

  it("unmount khi đang vẽ → không lỗi console, không còn timer/rAF treo", async () => {
    const err = vi.spyOn(console, "error");
    const { unmount } = render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance(10000);
    expect(err).not.toHaveBeenCalled();
  });

  it("unmount khi đang chờ delay → huỷ timeout", async () => {
    const err = vi.spyOn(console, "error");
    const { unmount } = render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    await advance(100);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance(10000);
    expect(err).not.toHaveBeenCalled();
  });

  describe("chỉ vẽ khi hình đã lọt vào màn hình", () => {
    const SCROLL = "cuộn xuống để xem vẽ…";
    const TYPING = "chờ bản dịch gõ xong…";

    beforeEach(() => {
      FakeObserver.all = [];
      vi.stubGlobal("IntersectionObserver", FakeObserver);
    });

    it("đang gõ: chưa quan sát, chỉ có chữ chờ bản dịch", () => {
      render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
      expect(FakeObserver.all).toHaveLength(0);
      expect(screen.getByText(TYPING)).toBeTruthy();
      expect(screen.queryByText(SCROLL)).toBeNull();
    });

    it("gõ xong: quan sát svg với ngưỡng 90%; chưa có kết quả đo thì chưa hiện chữ gì", () => {
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      expect(lastObserver().options.threshold).toBe(0.9);
      expect(lastObserver().target).toBe(screen.getByRole("img"));
      expect(screen.queryByText(TYPING)).toBeNull();
      expect(screen.queryByText(SCROLL)).toBeNull();
    });

    it("gõ xong mà hình chưa lọt màn hình: đợi mãi, báo cuộn xuống, chưa tính là đã xem", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      lastObserver().report(0);
      expect(screen.getByText(SCROLL)).toBeTruthy();
      await advance(10000);
      expect(sketchEl().dataset.state).toBe("waiting");
      expect(screen.queryByTestId("sketch-pencil")).toBeNull();
      expect(localStorage.getItem("tie:sketch-seen:p")).toBeNull();
    });

    it("chỉ hiện một phần (dưới 90%) thì vẫn chưa vẽ", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      lastObserver().report(0.5);
      await advance(1000);
      expect(sketchEl().dataset.state).toBe("waiting");
      expect(screen.getByText(SCROLL)).toBeTruthy();
    });

    it("cuộn tới: 450ms tính từ lúc đủ 2 điều kiện, không hiện chữ gì trong lúc chờ, ngắt quan sát", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
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

    it("hình đã hiện từ lúc đang gõ rồi cuộn đi: gõ xong mà không còn trên màn hình thì chưa vẽ", async () => {
      const { rerender } = render(<PassageSketch sketch={sketch} passageId="p" start={false} />);
      await advance(1000);
      rerender(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      lastObserver().report(0);
      await advance(1000);
      expect(sketchEl().dataset.state).toBe("waiting");
      expect(screen.getByText(SCROLL)).toBeTruthy();
    });

    it("đã lọt màn hình thì khoá lại: cuộn đi lúc chờ delay hay lúc vẽ cũng không dừng", async () => {
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
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
      const { unmount } = render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      const io = lastObserver();
      expect(io.disconnected).toBe(false);
      unmount();
      expect(io.disconnected).toBe(true);
    });

    it("cửa sổ quá thấp, không bao giờ chứa nổi 90% hình: hạ ngưỡng theo phần cửa sổ chứa được", () => {
      vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 1536 } as DOMRect);
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />); // jsdom: innerHeight = 768
      expect(lastObserver().options.threshold).toBeCloseTo(0.45);
    });

    it("đã xem hoặc giảm chuyển động: không cần quan sát, hiện sẵn", () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      expect(sketchEl().dataset.state).toBe("done");
      expect(FakeObserver.all).toHaveLength(0);
    });

    it("vẽ lại không cần chờ lọt màn hình", () => {
      localStorage.setItem("tie:sketch-seen:p", "1");
      render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
      fireEvent.click(screen.getByRole("button", { name: "↻ vẽ lại" }));
      expect(sketchEl().dataset.state).toBe("drawing");
      expect(FakeObserver.all).toHaveLength(0);
    });
  });

  it("trình duyệt không có IntersectionObserver: coi như đã thấy, vẽ sau 450ms", async () => {
    expect("IntersectionObserver" in window).toBe(false);
    render(<PassageSketch sketch={sketch} passageId="p" start={true} />);
    await advance(450);
    expect(sketchEl().dataset.state).toBe("drawing");
  });
});
