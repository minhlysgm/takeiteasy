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
});
