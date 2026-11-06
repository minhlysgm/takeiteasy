"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { annotate, annotationGroup } from "rough-notation";
import type { Chunk } from "@/content/types";
import { buildEdgeArrow, layoutNotes, pickNoteSide, type Box, type NoteSide } from "@/lib/annotate";
import { MOBILE_QUERY } from "@/lib/breakpoints";
import { prefersReducedMotion } from "@/lib/motion";

// Số đo ghi chú lề (px). Mũi tên ngắn: ghi chú —(NOTE_GAP)— đuôi mũi tên —(ARROW_LEN)— đầu mũi tên —(TIP_GAP)— mép chữ.
const NOTE_MAX_W = 170;
const NOTE_LINE_H = 23; // một dòng chữ tay 16.5px leading-snug — chưa đo được thì coi ghi chú cao một dòng
const PAGE_PAD = 16; // ghi chú cách mép màn đọc
const TIP_GAP = 10;
const ARROW_LEN = 28;
const NOTE_GAP = 6;
const NOTE_STACK_GAP = 6; // hai ghi chú cùng lề cách nhau ít nhất

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chunks: Chunk[];
  onChunkClick: (chunkId: string) => void;
}

interface NotePos {
  chunk: Chunk;
  side: NoteSide;
  /** Lề trái: mép phải ghi chú (tính từ mép phải khung); lề phải: mép trái ghi chú — ghi chú luôn sát đuôi mũi tên */
  anchor: number;
  maxWidth: number;
  noteY: number;
  arrow: string;
}

const toBox = (r: DOMRect, o: DOMRect): Box => ({
  left: r.left - o.left,
  right: r.right - o.left,
  top: r.top - o.top,
  bottom: r.bottom - o.top,
});

export function AnnotationLayer({ containerRef, chunks, onChunkClick }: Props) {
  const [notes, setNotes] = useState<NotePos[]>([]);

  // 1) underline tay vẽ, lần lượt từng chunk
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = prefersReducedMotion();
    const marks = chunks
      .map((c) => container.querySelector<HTMLElement>(`[data-chunk-id="${c.id}"]`))
      .filter((el): el is HTMLElement => el !== null)
      .map((el) =>
        annotate(el, {
          type: "underline",
          color: "var(--ink)",
          strokeWidth: 2,
          animationDuration: 400,
          animate: !reduced,
          multiline: true,
        }),
      );
    const group = annotationGroup(marks);
    group.show();
    return () => marks.forEach((m) => m.remove());
  }, [chunks, containerRef]);

  // 2) đo vị trí chunk → ghi chú lề + mũi tên ngắn tới mép cột; tính lại khi resize
  // Dùng useEffect (không phải useLayoutEffect): containerRef được gắn trên
  // div cha, và AnnotationLayer render như con cuối cùng của div đó — trong
  // cùng một commit, layout effect của con chạy TRƯỚC bước attach ref của
  // cha (post-order), nên containerRef.current vẫn là null nếu đo ở layout
  // effect. useEffect chạy sau khi toàn cây đã commit nên ref đã sẵn sàng.
  // Mobile ẩn ghi chú lề (đã có danh sách ghi chú riêng) → khỏi đo; gạch chân ở effect 1 vẫn chạy.
  const heights = useRef<Record<string, number>>({});
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const recompute = useRef<() => void>(() => {});
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const mq = typeof window.matchMedia === "function" ? window.matchMedia(MOBILE_QUERY) : null;
    const compute = () => {
      if (mq?.matches) {
        setNotes((prev) => (prev.length ? [] : prev));
        return;
      }
      const cRect = container.getBoundingClientRect();
      // Mép cột = mép khung chữ mô tả (không tính phần đệm của cột): mũi tên dừng cách đó TIP_GAP, không vào vùng chữ
      const textEl =
        container.querySelector<HTMLElement>('[data-testid="caption-text"]') ??
        container.querySelector<HTMLElement>('[data-testid="caption-col"]');
      const col = textEl ? toBox(textEl.getBoundingClientRect(), cRect) : { left: 0, right: cRect.width };
      const tip = { left: col.left - TIP_GAP, right: col.right + TIP_GAP };
      const raw = chunks.flatMap((c) => {
        const el = container.querySelector<HTMLElement>(`[data-chunk-id="${c.id}"]`);
        if (!el) return [];
        // Mỗi dòng một rect: cụm xuống dòng thì khung bao 2 dòng sẽ chỉ sai chữ
        let rects = [...el.getClientRects()].filter((r) => r.width > 0).map((r) => toBox(r, cRect));
        if (!rects.length) rects = [toBox(el.getBoundingClientRect(), cRect)];
        const { side, line } = pickNoteSide(rects, col);
        return [{ chunk: c, side, lineMid: (line.top + line.bottom) / 2 }];
      });
      const next: NotePos[] = [];
      for (const side of ["left", "right"] as const) {
        const items = raw.filter((r) => r.side === side);
        const ys = layoutNotes(
          items.map((r) => ({
            id: r.chunk.id,
            y: r.lineMid - NOTE_LINE_H / 2,
            height: heights.current[r.chunk.id] ?? NOTE_LINE_H,
          })),
          NOTE_STACK_GAP,
        );
        for (const r of items) {
          const noteY = ys[r.chunk.id];
          const to = { x: tip[side], y: r.lineMid };
          const tail = side === "left" ? to.x - ARROW_LEN : to.x + ARROW_LEN;
          const from = { x: tail, y: noteY + NOTE_LINE_H / 2 };
          // Ghi chú nằm trọn trong lề: không tràn khỏi màn, không chạm đuôi mũi tên
          const edge = side === "left" ? tail - NOTE_GAP : tail + NOTE_GAP;
          const room = side === "left" ? edge - PAGE_PAD : cRect.width - PAGE_PAD - edge;
          next.push({
            chunk: r.chunk,
            side,
            anchor: side === "left" ? cRect.width - edge : edge,
            maxWidth: Math.max(0, Math.min(NOTE_MAX_W, room)),
            noteY,
            arrow: buildEdgeArrow(from, to),
          });
        }
      }
      setNotes(next);
    };
    recompute.current = compute;
    compute();
    window.addEventListener("resize", compute);
    mq?.addEventListener("change", compute);
    return () => {
      window.removeEventListener("resize", compute);
      mq?.removeEventListener("change", compute);
    };
  }, [chunks, containerRef]);

  // 3) Ghi chú dài xuống 2 dòng (lề hẹp ở 1024px) → đo chiều cao thật rồi xếp lại cho khỏi đè nhau
  useLayoutEffect(() => {
    let changed = false;
    for (const n of notes) {
      const h = buttons.current[n.chunk.id]?.offsetHeight;
      if (h && Math.abs(h - (heights.current[n.chunk.id] ?? NOTE_LINE_H)) > 1) {
        heights.current[n.chunk.id] = h;
        changed = true;
      }
    }
    if (changed) recompute.current();
  }, [notes]);

  return (
    <>
      <svg data-testid="annotation-arrows" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
          </marker>
        </defs>
        {notes.map((n) => (
          <path
            key={n.chunk.id}
            data-note-for={n.chunk.id}
            d={n.arrow}
            pathLength={100}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            className="arrow-draw"
          />
        ))}
      </svg>
      {notes.map((n) => (
        <button
          key={n.chunk.id}
          ref={(el) => void (buttons.current[n.chunk.id] = el)}
          type="button"
          data-note-for={n.chunk.id}
          onClick={() => onChunkClick(n.chunk.id)}
          className={`absolute w-max whitespace-pre-line focus-visible:outline-offset-0 font-hand text-[16.5px] leading-snug text-ink ${n.side === "left" ? "text-right" : "text-left"}`}
          style={{
            top: n.noteY,
            ...(n.side === "left" ? { right: n.anchor } : { left: n.anchor }),
            maxWidth: n.maxWidth,
            transform: n.side === "left" ? "rotate(-1.5deg)" : "rotate(1.2deg)",
          }}
        >
          {n.chunk.label}
        </button>
      ))}
    </>
  );
}
