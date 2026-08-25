"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Book, Passage } from "@/content/types";
import { prefersReducedMotion } from "@/lib/motion";
import { saveProgress } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { useTypingText } from "@/lib/useTypingText";
import { AnnotationLayer } from "./AnnotationLayer";
import { OriginalText } from "./OriginalText";

interface Props {
  book: Book;
  chapterId: string;
  passage: Passage;
  passageIndex: number; // 1-based
  passageCount: number;
}

export function PassageView({ book, chapterId, passage, passageIndex, passageCount }: Props) {
  const router = useRouter();
  const [explainOn, setExplainOn] = useState(false);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const typing = useTypingText(passage.translation, { enabled: !reduced });

  useEffect(() => {
    saveProgress({ bookId: book.id, chapterId, passageIndex });
  }, [book.id, chapterId, passageIndex]);

  useEffect(() => {
    const goTo = (i: number) => {
      if (i >= 1 && i <= passageCount) router.push(`/read/${book.id}/${chapterId}/${i}`);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!typing.done && e.key !== "Escape") {
        typing.skip();
        return;
      }
      if (drawerIndex !== null) {
        // Task 9 mở rộng: j/k/esc cho drawer
        if (e.key === "Escape") setDrawerIndex(null);
        return;
      }
      switch (e.key) {
        case "Enter":
        case "ArrowRight":
          goTo(passageIndex + 1);
          break;
        case "ArrowLeft":
          goTo(passageIndex - 1);
          break;
        case "e":
          setExplainOn((v) => !v);
          break;
        case "s":
          speak(passage.original);
          break;
        case "Escape":
          setExplainOn(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typing, drawerIndex, passageIndex, passageCount, book.id, chapterId, passage.original, router]);

  const openChunk = (chunkId: string) => {
    const i = passage.chunks.findIndex((c) => c.id === chunkId);
    if (i >= 0) setDrawerIndex(i);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-11 shrink-0 items-center gap-4 border-b border-line bg-surface px-5">
        <div className="flex gap-2" aria-hidden="true">
          <span className="block h-3 w-3 rounded-full bg-danger opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-ink opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-accent opacity-70" />
        </div>
        <div className="grow text-center text-[13px] text-muted">
          takeiteasy — {book.id} / {chapterId} · đoạn {passageIndex}/{passageCount}
          {explainOn && <span className="text-ink"> · explain</span>}
        </div>
        <div className="w-14 shrink-0" />
      </header>

      <div ref={readerRef} data-testid="reader" className="relative grid grow grid-cols-[220px_1fr_1fr] px-8 py-12">
        <div aria-hidden="true" />
        <div data-testid="original-col" className="relative border-r border-line pr-12">
          <div className="mb-6 text-[13px] text-muted">
            {"// nguyên văn"}
            {explainOn && <span className="ml-3 text-ink">{passage.chunks.length} chunks đáng học</span>}
          </div>
          <OriginalText passage={passage} explainOn={explainOn} onChunkClick={openChunk} />
          {/* SpeechTooltip (Task 10) */}
        </div>
        <div
          data-testid="translation-col"
          className={`pl-12 transition-opacity ${explainOn ? "opacity-30" : ""}`}
          onClick={() => typing.skip()}
        >
          <div className="mb-6 flex items-baseline gap-3 text-[13px]">
            <span className="text-muted">{"// bản dịch"}</span>
            {!typing.done && <span className="text-xs text-accent">đang gõ…</span>}
          </div>
          <div className="text-[15.5px] leading-[2]">
            {typing.display}
            {!typing.done && (
              <span className="animate-blink ml-0.5 inline-block h-[19px] w-[9px] translate-y-[3px] bg-accent" />
            )}
          </div>
          {typing.done && passage.mainIdea && (
            <div className="mt-8 border-t border-line pt-5 text-[13.5px] leading-relaxed text-muted">
              <span className="text-accent">{"// ý chính"}</span>
              <p className="mt-2">{passage.mainIdea}</p>
            </div>
          )}
        </div>
        {explainOn && (
          <AnnotationLayer containerRef={readerRef} chunks={passage.chunks} onChunkClick={openChunk} />
        )}
        {/* ChunkDrawer (Task 9) */}
      </div>

      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-line px-8 text-[13px] text-muted">
        <div className="flex items-center gap-5">
          <span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">e</kbd> giải thích</span>
          <span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">s</kbd> đọc to</span>
          <span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">enter</kbd> đoạn tiếp</span>
        </div>
        <div className="h-1 w-44 rounded bg-line">
          <div className="h-full rounded bg-accent" style={{ width: `${(passageIndex / passageCount) * 100}%` }} />
        </div>
        <div>{chapterId} · {passageIndex}/{passageCount}</div>
      </footer>
    </div>
  );
}
