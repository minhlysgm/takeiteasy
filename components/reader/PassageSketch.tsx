"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Sketch, SketchStep, SketchTone } from "@/content/types";
import { buildTimeline, drawMs, frameAt, locateOnSubpaths, SKETCH_START_DELAY_MS, visibleThreshold, type MeasuredStep, type Pt, type TimedStep } from "@/lib/sketch/timeline";
import { splitSubpaths, stepPaths } from "@/lib/sketch/paths";
import { isSketchSeen, markSketchSeen } from "@/lib/sketchSeen";
import { prefersReducedMotion } from "@/lib/motion";

type State = "idle" | "waiting" | "drawing" | "done";
type TextStep = Extract<SketchStep, { kind: "text" }>;

type Item =
  | { kind: "path"; key: string; subpaths: string[]; cls: string; width: number; plain: boolean }
  | { kind: "text"; key: string; step: TextStep; clipId: string }
  | { kind: "pause"; key: string; ms: number };

/** Một <path> của item. `dash` dài hơn nét 2 đơn vị để lúc ẩn không lộ chấm tròn của round cap; 0 = không đo được. */
type LiveSub = { el: SVGPathElement | null; len: number; dash: number };

/** Số đo của từng item, lấy từ DOM lúc bắt đầu vẽ */
type Live =
  | { kind: "path"; subs: LiveSub[] }
  | { kind: "text"; rect: SVGRectElement | null; w: number }
  | { kind: "pause" };

const STROKE: Record<"line" | "ink", string> = { line: "stroke-text", ink: "stroke-ink" };
const FILL: Record<SketchTone, string> = { ink: "fill-ink", name: "fill-bright", muted: "fill-muted", line: "fill-text" };
const FONT_WAIT_MS = 1500;

const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;

function pointOn(el: SVGPathElement | null, at: number): Pt {
  if (!el || typeof el.getPointAtLength !== "function") return [0, 0];
  const q = el.getPointAtLength(at);
  return [q.x, q.y];
}

/** Chờ font tay tải xong để đo chữ cho đúng, tối đa FONT_WAIT_MS. Trả hàm huỷ timeout. */
function waitFonts(): { ready: Promise<unknown>; cancel: () => void } {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts?.ready) return { ready: Promise.resolve(), cancel: () => {} };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise((r) => (timer = setTimeout(r, FONT_WAIT_MS)));
  const ready = Promise.race([fonts.ready, timeout]).finally(() => clearTimeout(timer));
  return { ready, cancel: () => clearTimeout(timer) };
}

export function PassageSketch({ sketch, passageId, start, dimmed = false }: { sketch: Sketch; passageId: string; start: boolean; dimmed?: boolean }) {
  const [state, setState] = useState<State>("idle");
  const [reduced, setReduced] = useState(false);
  // Hình có đang trên màn hình không. Chỉ đo sau khi bản dịch gõ xong; "yes" là chốt luôn, cuộn đi cũng không đổi.
  const [onScreen, setOnScreen] = useState<"unknown" | "no" | "yes">("unknown");
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const { home, fullRect } = useMemo(() => {
    const [x, y, w, h] = sketch.viewBox.split(/[\s,]+/).map(Number);
    return {
      home: [w - 10, 8] as Pt,
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

  // Khi mount: giảm chuyển động hoặc đã xem → hiện sẵn; còn lại chờ bản dịch gõ xong
  useEffect(() => {
    const rm = prefersReducedMotion();
    setReduced(rm);
    setState(rm || isSketchSeen(passageId) ? "done" : "waiting");
  }, [passageId]);

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

  /** Đo DOM, dựng timeline, xoá trắng hình rồi chuyển sang "drawing" */
  const begin = useCallback(() => {
    const measured: MeasuredStep[] = [];
    live.current = items.map((it, i): Live => {
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
        start: pointOn(subs[0]?.el ?? null, 0),
        end: pointOn(last?.el ?? null, last?.len ?? 0),
      });
      return { kind: "path", subs };
    });
    timeline.current = buildTimeline(measured, home);
    live.current.forEach((l) => setP(l, 0));
    setState("drawing");
  }, [items, home]);

  /** Hiện đủ hình (bỏ dash, mở clip hết cỡ) → "done" + nhớ đã xem */
  const finish = useCallback(() => {
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
    setState("done");
    markSketchSeen(passageId);
  }, [passageId, fullRect]);

  const seen = onScreen === "yes";

  // waiting + start → đợi hình lọt vào màn hình
  useEffect(() => {
    if (state !== "waiting" || !start || seen) return;
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
  }, [state, start, seen]);

  // đủ 2 điều kiện → chờ delay → chờ font → đo và vẽ
  useEffect(() => {
    if (state !== "waiting" || !start || !seen) return;
    let alive = true;
    let fonts: ReturnType<typeof waitFonts> | undefined;
    const timer = setTimeout(() => {
      fonts = waitFonts();
      fonts.ready.then(() => {
        if (alive) begin();
      });
    }, SKETCH_START_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      fonts?.cancel();
    };
  }, [state, start, seen, begin]);

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
      pencilBody.current?.setAttribute("transform", `rotate(${(-52 + Math.sin(now / 95) * 2.5).toFixed(2)})`);
    };

    const tick = (now: number) => {
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

  const hidden = state === "idle" || state === "waiting";
  const waitingFor = !start ? "chờ bản dịch gõ xong…" : onScreen === "no" ? "cuộn xuống để xem vẽ…" : null;
  const status = state === "waiting" ? waitingFor : state === "drawing" ? "đang vẽ…" : null;
  const btn = "ml-auto px-1 py-0.5 text-xs text-muted transition-colors hover:text-ink motion-reduce:transition-none";

  return (
    <section
      data-testid="sketch"
      data-state={state}
      className={`mt-9 transition-opacity motion-reduce:transition-none ${dimmed ? "opacity-30" : ""}`}
    >
      <div className="flex min-h-[22px] items-baseline gap-3 text-[13px]">
        <span className="text-muted">{"// phác thảo"}</span>
        {status && <span className="text-xs text-accent">{status}</span>}
        {state === "drawing" && (
          <button type="button" className={btn} onClick={finish}>
            xem ngay ⏭
          </button>
        )}
        {state === "done" && !reduced && (
          <button type="button" className={btn} onClick={begin}>
            ↻ vẽ lại
          </button>
        )}
      </div>
      <svg
        ref={svg}
        viewBox={sketch.viewBox}
        role="img"
        aria-label={sketch.alt}
        className={`mt-2 block h-auto w-full max-w-[520px] overflow-visible ${state === "drawing" ? "cursor-pointer" : ""}`}
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
        <g style={hidden ? { opacity: 0 } : undefined}>
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
                  className={`font-hand ${FILL[s.tone]}`}
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
          <g ref={pencil} data-testid="sketch-pencil" aria-hidden="true" transform={`translate(${home[0]},${home[1]})`}>
            <g ref={pencilBody} transform="rotate(-52)">
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
