"use client";
import { useEffect, useState } from "react";
import { annotate, annotationGroup } from "rough-notation";
import type { Chunk } from "@/content/types";
import { buildArrowPath, layoutNotes } from "@/lib/annotate";
import { MOBILE_QUERY } from "@/lib/breakpoints";
import { prefersReducedMotion } from "@/lib/motion";

const NOTE_H = 56;

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chunks: Chunk[];
  onChunkClick: (chunkId: string) => void;
}

interface NotePos {
  chunk: Chunk;
  side: "left" | "right";
  noteX: number;
  noteY: number;
  arrow: string;
}

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

  // 2) đo vị trí chunk → ghi chú lề + mũi tên; tính lại khi resize
  // Dùng useEffect (không phải useLayoutEffect): containerRef được gắn trên
  // div cha, và AnnotationLayer render như con cuối cùng của div đó — trong
  // cùng một commit, layout effect của con chạy TRƯỚC bước attach ref của
  // cha (post-order), nên containerRef.current vẫn là null nếu đo ở layout
  // effect. useEffect chạy sau khi toàn cây đã commit nên ref đã sẵn sàng.
  // Mobile ẩn ghi chú lề (đã có danh sách ghi chú riêng) → khỏi đo; gạch chân ở effect 1 vẫn chạy.
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
      // Chia ghi chú hai bên theo vị trí thật của chunk trong cột nguyên văn:
      // chunk ở nửa trái → ghi chú lề trái, nửa phải → ghi chú rãnh phải.
      // Mũi tên chỉ với sang chunk cùng phía nên ngắn và không cắt qua chữ.
      const colEl = container.querySelector<HTMLElement>('[data-testid="caption-col"]');
      const colRect = colEl ? colEl.getBoundingClientRect() : cRect;
      const colLeft = colRect.left - cRect.left;
      const colRight = colRect.right - cRect.left;
      const colMid = (colLeft + colRight) / 2;
      const raw = chunks.flatMap((c) => {
        const el = container.querySelector<HTMLElement>(`[data-chunk-id="${c.id}"]`);
        if (!el) return [];
        const r = el.getBoundingClientRect();
        return [{
          chunk: c,
          y: r.top - cRect.top,
          bottom: r.bottom - cRect.top,
          left: r.left - cRect.left,
          right: r.right - cRect.left,
        }];
      });
      const next: NotePos[] = [];
      for (const side of ["left", "right"] as const) {
        const items = raw.filter(
          (r) => ((r.left + r.right) / 2 <= colMid) === (side === "left"),
        );
        const ys = layoutNotes(items.map((r) => ({ id: r.chunk.id, y: r.y, height: NOTE_H })));
        for (const r of items) {
          const noteY = ys[r.chunk.id];
          // Mũi tên xuất phát sát mép ghi chú (không phải mép cột chữ) để
          // nối liền ghi chú → chunk, user nhìn là thấy cặp nào đi với nhau.
          next.push(
            side === "left"
              ? {
                  chunk: r.chunk, side, noteX: 16, noteY,
                  arrow: buildArrowPath({ x: 16 + 172, y: noteY + 14 }, { x: r.left - 4, y: r.bottom + 6 }),
                }
              : {
                  chunk: r.chunk, side, noteX: colRight + 16, noteY,
                  arrow: buildArrowPath({ x: colRight + 10, y: noteY + 14 }, { x: r.right + 4, y: r.bottom + 6 }),
                },
          );
        }
      }
      setNotes(next);
    };
    compute();
    window.addEventListener("resize", compute);
    mq?.addEventListener("change", compute);
    return () => {
      window.removeEventListener("resize", compute);
      mq?.removeEventListener("change", compute);
    };
  }, [chunks, containerRef]);

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
          </marker>
        </defs>
        {notes.map((n) => (
          <path
            key={n.chunk.id}
            d={n.arrow}
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
          type="button"
          onClick={() => onChunkClick(n.chunk.id)}
          className="absolute w-[170px] whitespace-pre-line focus-visible:outline-offset-0 text-left font-hand text-[16.5px] leading-snug text-ink"
          style={{
            top: n.noteY,
            left: n.noteX,
            transform: n.side === "left" ? "rotate(-1.5deg)" : "rotate(1.2deg)",
          }}
        >
          {n.chunk.label}
        </button>
      ))}
    </>
  );
}
