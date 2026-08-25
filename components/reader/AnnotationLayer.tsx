"use client";
import { useEffect, useState } from "react";
import { annotate, annotationGroup } from "rough-notation";
import type { Chunk } from "@/content/types";
import { buildArrowPath, layoutNotes } from "@/lib/annotate";
import { prefersReducedMotion } from "@/lib/motion";

const MARGIN_W = 220; // khớp cột lề trong PassageView
const NOTE_H = 56;

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chunks: Chunk[];
  onChunkClick: (chunkId: string) => void;
}

interface NotePos {
  chunk: Chunk;
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
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const compute = () => {
      const cRect = container.getBoundingClientRect();
      const raw = chunks.flatMap((c) => {
        const el = container.querySelector<HTMLElement>(`[data-chunk-id="${c.id}"]`);
        if (!el) return [];
        const r = el.getBoundingClientRect();
        return [{ chunk: c, y: r.top - cRect.top, x: r.left - cRect.left, bottom: r.bottom - cRect.top }];
      });
      const ys = layoutNotes(raw.map((r) => ({ id: r.chunk.id, y: r.y, height: NOTE_H })));
      setNotes(
        raw.map((r) => ({
          chunk: r.chunk,
          noteY: ys[r.chunk.id],
          arrow: buildArrowPath(
            { x: MARGIN_W - 20, y: ys[r.chunk.id] + 14 },
            { x: r.x, y: r.bottom + 6 },
          ),
        })),
      );
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
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
          className="absolute left-4 w-[190px] whitespace-pre-line text-left font-hand text-[17px] leading-snug text-ink"
          style={{ top: n.noteY, transform: "rotate(-1.5deg)" }}
        >
          {n.chunk.label}
        </button>
      ))}
    </>
  );
}
