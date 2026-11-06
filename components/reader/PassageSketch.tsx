"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import type { Sketch, SketchStep, SketchTone } from "@/content/types";
import { buildTimeline, drawMs, ease, frameAt, locateOnSubpaths, pencilAngle, SKETCH_EMPHASIS_MS, SKETCH_START_DELAY_MS, visibleRatio, visibleThreshold, type MeasuredStep, type Pt, type TimedStep } from "@/lib/sketch/timeline";
import { waitFonts } from "@/lib/sketch/fonts";
import { pointOn, splitSubpaths, stepPaths } from "@/lib/sketch/paths";
import { SKETCH_TEXT_HALO } from "@/lib/sketch/style";
import { isSketchSeen, markSketchSeen } from "@/lib/sketchSeen";
import { prefersReducedMotion } from "@/lib/motion";

type State = "idle" | "waiting" | "drawing" | "done";

/** "instant": hiện sẵn ngay khi mở (đã xem / giảm chuyển động). "animate": vừa vẽ xong (hoặc bị bỏ qua) trước mắt người đọc. */
export type SketchDone = "animate" | "instant";
/** finish(how): hiện đủ ngay, nhớ đã xem, báo `onDone(how)` ("animate" nếu không nói gì). */
export type SketchHandle = { finish(how?: SketchDone): void };
type TextStep = Extract<SketchStep, { kind: "text" }>;

type Item =
  | { kind: "path"; key: string; subpaths: string[]; cls: string; width: number; plain: boolean; emphasis: boolean }
  | { kind: "text"; key: string; step: TextStep; clipId: string }
  | { kind: "pause"; key: string; ms: number };

/** Một <path> của item. `dash` dài hơn nét 2 đơn vị để lúc ẩn không lộ chấm tròn của round cap; 0 = không đo được. */
type LiveSub = { el: SVGPathElement | null; len: number; dash: number };

/** Số đo của từng item, lấy từ DOM lúc bắt đầu vẽ */
type Live =
  | { kind: "path"; subs: LiveSub[] }
  | { kind: "text"; rect: SVGRectElement | null; w: number }
  | { kind: "pause" };

const STROKE: Record<"line" | "ink" | "accent", string> = { line: "stroke-text", ink: "stroke-ink", accent: "stroke-accent" };
const FILL: Record<SketchTone, string> = { ink: "fill-ink", name: "fill-bright", line: "fill-text", accent: "fill-accent" };

export function PassageSketch({
  sketch,
  passageId,
  dimmed = false,
  onDone,
  ref,
}: {
  sketch: Sketch;
  passageId: string;
  dimmed?: boolean;
  onDone?: (how: SketchDone) => void;
  ref?: Ref<SketchHandle>;
}) {
  const [state, setState] = useState<State>("idle");
  // Bản state đồng bộ cho finish() qua ref: gọi hai lần liên tiếp trước khi render lại vẫn chỉ báo một lần
  const stateRef = useRef<State>("idle");
  const go = useCallback((next: State) => {
    stateRef.current = next;
    setState(next);
  }, []);
  // onDone mới nhất, để callback trong effect/rAF không gọi bản cũ
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  // Mỗi thẻ một lần mount (PassageView key theo thẻ), nên chỉ cần cờ, không cần nhớ theo passageId.
  // Đã báo "instant" rồi (chống StrictMode chạy effect hai lần)
  const reportedInstant = useRef(false);
  // finish() đã chạy (người trên có thể gọi trước cả effect mở thẻ, vd. trong layout effect của mình)
  const finishedRef = useRef(false);
  const [reduced, setReduced] = useState(false);
  // Đã vẽ xong (hoặc bị bỏ qua) ngay trước mắt người đọc → nhãn trạng thái báo "vẽ xong" cho trình đọc màn hình
  const [finished, setFinished] = useState(false);
  // Hình có đang trên màn hình không. "yes" giữ nguyên cho tới lúc sắp vẽ;
  // ngay trước khi vẽ kiểm lại một lần, lướt qua rồi cuộn đi thì về "no" và chờ tiếp.
  const [onScreen, setOnScreen] = useState<"unknown" | "no" | "yes">("unknown");
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const { home, fullRect } = useMemo(() => {
    const [x, y, w, h] = sketch.viewBox.split(/[\s,]+/).map(Number);
    return {
      // chỗ bút nằm chờ: góc phải trên, đủ thấp để thân bút không trùi lên hàng tiêu đề
      home: [w - 70, 40] as Pt,
      // rect "lộ hết" của clipPath — rộng hơn viewBox vì svg overflow-visible
      fullRect: { x: x - w, y: y - h, width: w * 3, height: h * 3 },
    };
  }, [sketch.viewBox]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    sketch.steps.forEach((s, i) => {
      if (s.kind === "pause") out.push({ kind: "pause", key: `${i}`, ms: s.ms });
      else if (s.kind === "text") out.push({ kind: "text", key: `${i}`, step: s, clipId: `${uid}-clip-${i}` });
      else
        stepPaths(s).forEach((d, j) =>
          out.push({
            kind: "path",
            key: `${i}-${j}`,
            subpaths: splitSubpaths(d),
            cls: STROKE[s.tone],
            width: s.kind === "path" ? (s.width ?? 2) : 2,
            plain: s.kind === "path" && !!s.plain,
            emphasis: s.kind === "ellipse" && !!s.multi,
          }),
        );
    });
    return out;
  }, [sketch.steps, uid]);

  const els = useRef<(SVGTextElement | null)[]>([]);
  const pathEls = useRef<(SVGPathElement | null)[][]>([]);
  const rects = useRef<(SVGRectElement | null)[]>([]);
  const live = useRef<Live[]>([]);
  const timeline = useRef<TimedStep[]>([]);
  const svg = useRef<SVGSVGElement>(null);
  const pencil = useRef<SVGGElement>(null);
  const pencilBody = useRef<SVGGElement>(null);

  // Khi mở: giảm chuyển động hoặc đã xem → hiện sẵn và báo "instant"; còn lại chờ hình lọt khung rồi tự vẽ.
  // Layout effect: quyết trước khi trình duyệt vẽ khung đầu (lúc hydrate hay mở bằng điều hướng trong app),
  // để thẻ đã xem không loé một khung hình trống / "chờ vẽ".
  useLayoutEffect(() => {
    const rm = prefersReducedMotion();
    setReduced(rm);
    // finish() đã chạy trước effect: đã done và đã báo rồi, đừng báo thêm "instant"
    if (stateRef.current === "done" && finishedRef.current) return;
    if (rm || isSketchSeen(passageId)) {
      go("done");
      if (!reportedInstant.current) {
        reportedInstant.current = true;
        onDoneRef.current?.("instant");
      }
    } else go("waiting");
  }, [passageId, go]);

  const setP = (l: Live, p: number) => {
    if (l.kind === "path") {
      const { index, at } = locateOnSubpaths(l.subs.map((s) => s.len), p);
      l.subs.forEach((s, i) => {
        if (!s.el || s.dash <= 0) return;
        s.el.style.strokeDashoffset = String(p >= 1 || i < index ? 0 : i > index ? s.dash : s.dash - at);
      });
    }
    if (l.kind === "text" && l.rect) l.rect.setAttribute("width", String(l.w * p));
  };

  /** Hiện đủ hình (bỏ dash, mở clip hết cỡ) → "done"; `seen` thì nhớ là đã xem */
  const reveal = useCallback((seen: boolean) => {
    live.current.forEach((l) => {
      if (l.kind === "path") {
        for (const { el } of l.subs) {
          if (!el) continue;
          el.style.strokeDasharray = "";
          el.style.strokeDashoffset = "";
        }
      }
      if (l.kind === "text" && l.rect) {
        for (const [k, v] of Object.entries(fullRect)) l.rect.setAttribute(k, String(v));
      }
    });
    go("done");
    if (seen) markSketchSeen(passageId);
  }, [passageId, fullRect, go]);

  /** Xem xong (vẽ hết, người đọc bấm xem ngay, hoặc người trên gọi finish(how)) → báo onDone(how) */
  const finish = useCallback((how: SketchDone = "animate") => {
    reveal(true);
    setFinished(true);
    finishedRef.current = true;
    onDoneRef.current?.(how);
  }, [reveal]);

  useImperativeHandle(
    ref,
    () => ({
      finish: (how) => {
        if (stateRef.current !== "done") finish(how);
      },
    }),
    [finish],
  );

  /**
   * Đo DOM, dựng timeline, xoá trắng hình rồi chuyển sang "drawing". Đo lỗi thì hiện đủ hình, đừng để hình ẩn mãi,
   * nhưng không tính là đã xem: người đọc chưa được xem vẽ lần nào.
   */
  const begin = useCallback(() => {
    const measured: MeasuredStep[] = [];
    const measure = (it: Item, i: number): Live => {
      if (it.kind === "pause") {
        measured.push({ kind: "pause", rawMs: it.ms, start: [0, 0], end: [0, 0] });
        return { kind: "pause" };
      }
      if (it.kind === "text") {
        const el = els.current[i];
        const b = el && typeof el.getBBox === "function" ? el.getBBox() : { x: 0, y: 0, width: 0, height: 0 };
        const rect = rects.current[i];
        rect?.setAttribute("x", String(b.x - 3));
        rect?.setAttribute("y", String(b.y - 4));
        rect?.setAttribute("height", String(b.height + 8));
        const by = b.y + b.height * 0.78;
        measured.push({ kind: "text", rawMs: drawMs("text", it.step.text.length), start: [b.x, by], end: [b.x + b.width, by] });
        return { kind: "text", rect, w: b.width + 6 };
      }
      const subs = it.subpaths.map((_, j): LiveSub => {
        const el = pathEls.current[i]?.[j] ?? null;
        const measurable = !!el && typeof el.getTotalLength === "function";
        const len = measurable ? el.getTotalLength() : 0;
        const dash = measurable ? len + 2 : 0;
        if (el && dash > 0) el.style.strokeDasharray = `${dash} ${dash}`;
        return { el, len, dash };
      });
      // Cả item vẫn là một bước: thời gian tính theo tổng độ dài các đoạn con
      const total = subs.reduce((a, s) => a + s.len, 0);
      const last = subs[subs.length - 1];
      measured.push({
        kind: "path",
        rawMs: drawMs("path", total > 0 ? total + 2 : 0, it.plain),
        fixedMs: it.emphasis ? SKETCH_EMPHASIS_MS : undefined,
        start: pointOn(subs[0]?.el ?? null, 0),
        end: pointOn(last?.el ?? null, last?.len ?? 0),
      });
      return { kind: "path", subs };
    };
    // Gán trước khi đo: lỗi giữa chừng thì finish vẫn dọn được các item đã đo
    const next: Live[] = [];
    live.current = next;
    try {
      items.forEach((it, i) => next.push(measure(it, i)));
      timeline.current = buildTimeline(measured, home);
      next.forEach((l) => setP(l, 0));
      go("drawing");
    } catch {
      reveal(false);
      onDoneRef.current?.("animate");
    }
  }, [items, home, reveal, go]);

  const visible = onScreen === "yes";

  // waiting → đợi hình lọt vào màn hình
  useEffect(() => {
    if (state !== "waiting" || visible) return;
    if (typeof IntersectionObserver === "undefined") return setOnScreen("yes");
    const el = svg.current;
    if (!el) return;
    const threshold = visibleThreshold(el.getBoundingClientRect().height, window.innerHeight);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[entries.length - 1].intersectionRatio >= threshold;
        setOnScreen((prev) => (hit || prev === "yes" ? "yes" : "no"));
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, visible]);

  // hình đã lọt khung → chờ delay → chờ font → đo và vẽ
  useEffect(() => {
    if (state !== "waiting" || !visible) return;
    let alive = true;
    let fonts: ReturnType<typeof waitFonts> | undefined;
    const go = () => {
      if (!alive) return;
      const el = svg.current;
      if (el && typeof IntersectionObserver !== "undefined") {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (visibleRatio(r.top, r.bottom, vh) < visibleThreshold(r.height, vh)) return setOnScreen("no");
      }
      begin();
    };
    const timer = setTimeout(() => {
      fonts = waitFonts();
      fonts.ready.then(go, go);
    }, SKETCH_START_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      fonts?.cancel();
    };
  }, [state, visible, begin]);

  // vòng rAF khi đang vẽ
  useEffect(() => {
    if (state !== "drawing") return;
    const tl = timeline.current;
    const lv = live.current;
    const end = tl.length ? tl[tl.length - 1].t2 : 0;
    let raf = 0;
    let t0: number | null = null;
    let cur = 0;

    const place = ([x, y]: Pt, now: number) => {
      pencil.current?.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      pencilBody.current?.setAttribute("transform", `rotate(${(pencilAngle(y) + Math.sin(now / 95) * 2.5).toFixed(2)})`);
    };

    const tick = (now: number) => {
      // finish() vừa chạy (state chưa kịp render lại để huỷ rAF): đừng vẽ đè lên hình đã hiện đủ
      if (stateRef.current !== "drawing") return;
      if (t0 === null) t0 = now;
      const t = now - t0;
      if (t >= end) return finish();
      const f = frameAt(tl, t);
      for (; cur < f.index; cur++) setP(lv[cur], 1);
      const s = tl[f.index];
      const l = lv[f.index];
      if (f.phase === "travel") {
        const q = ease(f.progress);
        place([s.from[0] + (s.start[0] - s.from[0]) * q, s.from[1] + (s.start[1] - s.from[1]) * q - Math.sin(q * Math.PI) * 6], now);
      } else {
        const p = ease(f.progress);
        setP(l, p);
        if (l.kind === "path") {
          const { index, at } = locateOnSubpaths(l.subs.map((x) => x.len), p);
          place(pointOn(l.subs[index]?.el ?? null, at), now);
        }
        else if (l.kind === "text") place([s.start[0] + (s.end[0] - s.start[0]) * p, s.start[1]], now);
        else place(s.end, now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, finish]);

  const waitingFor = onScreen === "no" ? "cuộn tới hình để xem vẽ…" : null;
  const status = state === "waiting" ? waitingFor : state === "drawing" ? "đang vẽ…" : null;
  // Một nút duy nhất, chỉ đổi nhãn: bấm bằng bàn phím xong focus vẫn còn ở nút
  const action = state === "drawing" ? "skip" : state === "done" && !reduced ? "replay" : null;

  return (
    <section
      data-testid="sketch"
      data-state={state}
      className={`transition-opacity motion-reduce:transition-none ${dimmed ? "opacity-30 focus-within:opacity-100" : ""}`}
    >
      {/* flex-wrap: cột hẹp thì xuống dòng, đừng nong cột ra theo tổng chiều dài các nhãn */}
      <div className="flex min-h-[22px] flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
        <span className="whitespace-nowrap text-muted">{"// hình"}</span>
        {/* Chỗ báo trạng thái duy nhất của thẻ: luôn có mặt, chỉ đổi chữ (vẽ xong thì chỉ trình đọc màn hình nghe) */}
        <span role="status" className="text-xs text-accent">
          {status}
          {state === "done" && finished && <span className="sr-only">vẽ xong</span>}
        </span>
        {action && (
          <button
            type="button"
            className="ml-auto whitespace-nowrap px-1 py-0.5 text-xs text-muted transition-colors hover:text-ink motion-reduce:transition-none"
            onClick={action === "skip" ? () => finish() : begin}
          >
            {action === "skip" ? "xem ngay ⏭" : "↻ vẽ lại"}
          </button>
        )}
      </div>
      <svg
        ref={svg}
        viewBox={sketch.viewBox}
        role="img"
        aria-label={sketch.alt}
        className={`mt-6 block h-auto w-full max-w-[520px] overflow-visible ${state === "drawing" ? "cursor-pointer" : ""}`}
        onClick={() => state === "drawing" && finish()}
      >
        <defs>
          {items.map((it, i) =>
            it.kind === "text" ? (
              <clipPath key={it.key} id={it.clipId}>
                <rect ref={(r) => void (rects.current[i] = r)} {...fullRect} />
              </clipPath>
            ) : null,
          )}
        </defs>
        {/* idle (chưa quyết, kể cả HTML server): ẩn bằng class để CSS lúc chưa hydrate lật được cho thẻ đã xem */}
        <g
          data-testid="sketch-art"
          className={state === "idle" ? "sketch-art-idle" : undefined}
          style={state === "waiting" ? { opacity: 0 } : undefined}
        >
          {items.map((it, i) => {
            if (it.kind === "pause") return null;
            if (it.kind === "text") {
              const s = it.step;
              return (
                <text
                  key={it.key}
                  ref={(r) => void (els.current[i] = r)}
                  x={s.x}
                  y={s.y}
                  fontSize={s.size}
                  textAnchor={s.anchor}
                  clipPath={`url(#${it.clipId})`}
                  className={`font-hand stroke-bg [paint-order:stroke] ${FILL[s.tone]}`}
                  strokeWidth={SKETCH_TEXT_HALO}
                  strokeLinejoin="round"
                >
                  {s.text}
                </text>
              );
            }
            return it.subpaths.map((d, j) => (
              <path
                key={`${it.key}-${j}`}
                data-step={it.key}
                ref={(r) => void ((pathEls.current[i] ??= [])[j] = r)}
                d={d}
                className={it.cls}
                strokeWidth={it.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ));
          })}
        </g>
        {state === "drawing" && (
          <g
            ref={pencil}
            data-testid="sketch-pencil"
            aria-hidden="true"
            className="pointer-events-none"
            transform={`translate(${home[0]},${home[1]})`}
          >
            <g ref={pencilBody} transform={`rotate(${pencilAngle(home[1])})`}>
              <polygon points="0,0 6,-2.2 6,2.2" className="fill-text" />
              <polygon points="6,-2.2 17,-6 17,6 6,2.2" className="fill-surface stroke-text" strokeWidth={0.6} />
              <rect x="17" y="-6" width="46" height="12" className="fill-ink" />
              <line x1="17" y1="0" x2="63" y2="0" className="stroke-bg" strokeWidth={0.8} opacity={0.35} />
              <rect x="63" y="-6.4" width="7" height="12.8" className="fill-muted" />
              <rect x="70" y="-6" width="9" height="12" rx="3" className="fill-danger" opacity={0.85} />
            </g>
          </g>
        )}
      </svg>
    </section>
  );
}
