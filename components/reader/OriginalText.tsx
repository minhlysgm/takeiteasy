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
    const n = passage.chunks.indexOf(r.chunk) + 1;
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
    if (explainOn) {
      // Số tròn là phần tử inline (không phải inline-block) và chữ số vẽ bằng ::after:
      // trình duyệt coi "cụm②," như một từ liền → không ngắt dòng giữa cụm, số và dấu câu;
      // bôi đen / copy / "nghe" không dính số. Trình đọc màn hình dùng danh sách ghi chú bên dưới.
      parts.push(
        <span
          key={`${r.chunk.id}-n`}
          aria-hidden="true"
          data-testid="chunk-badge"
          data-n={n}
          onClick={() => onChunkClick(r.chunk.id)}
          className="relative ml-1 cursor-pointer select-none rounded-full border border-ink px-[6px] py-[3px] align-[1px] text-[12px] leading-none text-ink before:absolute before:-inset-2 before:content-[''] after:content-[attr(data-n)] lg:hidden"
        />,
      );
    }
    cursor = r.end;
  }
  if (cursor < passage.original.length) parts.push(passage.original.slice(cursor));
  return <div data-testid="original-text" className="whitespace-pre-line text-[17px] leading-[1.9] text-bright">{parts}</div>;
}
