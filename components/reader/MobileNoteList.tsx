"use client";
import type { Chunk } from "@/content/types";

interface Props {
  chunks: Chunk[];
  onChunkClick: (chunkId: string) => void;
}

/** Ghi chú tay đánh số cho explain mode trên mobile (thay ghi chú lề + mũi tên của desktop). */
export function MobileNoteList({ chunks, onChunkClick }: Props) {
  return (
    <ol data-testid="mobile-notes" className="mt-5 flex flex-col gap-2.5 lg:hidden">
      {chunks.map((chunk, i) => (
        <li key={chunk.id}>
          <button
            type="button"
            onClick={() => onChunkClick(chunk.id)}
            className="flex min-h-[44px] w-full items-center gap-3 text-left"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink text-[13px] text-ink"
            >
              {i + 1}
            </span>
            <span
              className={`whitespace-pre-line font-hand text-[17px] leading-snug text-ink ${i % 2 === 0 ? "rotate-[-1deg]" : "rotate-1"}`}
            >
              {chunk.label}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
