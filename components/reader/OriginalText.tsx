"use client";
import type { Passage } from "@/content/types";
import { findChunkRanges } from "@/lib/content";

interface Props {
  passage: Passage;
  explainOn: boolean;
  onChunkClick: (chunkId: string) => void;
}

export function OriginalText({ passage, explainOn, onChunkClick }: Props) {
  const ranges = findChunkRanges(passage.original, passage.chunks);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) parts.push(passage.original.slice(cursor, r.start));
    parts.push(
      <span
        key={r.chunk.id}
        data-chunk-id={r.chunk.id}
        className={explainOn ? "cursor-pointer text-ink-strong" : undefined}
        onClick={explainOn ? () => onChunkClick(r.chunk.id) : undefined}
      >
        {passage.original.slice(r.start, r.end)}
      </span>,
    );
    cursor = r.end;
  }
  if (cursor < passage.original.length) parts.push(passage.original.slice(cursor));
  return <div className="text-[17px] leading-[1.9] text-bright">{parts}</div>;
}
