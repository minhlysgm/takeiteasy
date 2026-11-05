"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, Passage } from "@/content/types";
import { chapterLabel } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/motion";
import { saveProgress } from "@/lib/progress";
import { isSpeechAvailable, speak, stopSpeech } from "@/lib/speech";
import { useTheme } from "@/lib/useTheme";
import { useTypingText } from "@/lib/useTypingText";
import { AnnotationLayer } from "./AnnotationLayer";
import { ChunkDrawer } from "./ChunkDrawer";
import { FirstTimeHint } from "./FirstTimeHint";
import { OriginalText } from "./OriginalText";
import { PassageSketch } from "./PassageSketch";
import { SpeechTooltip } from "./SpeechTooltip";

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
  const [drawerClosing, setDrawerClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const originalColRef = useRef<HTMLDivElement>(null);
  const typing = useTypingText(passage.translation);
  const { toggle: toggleTheme } = useTheme();
  // Đọc khả năng speech sau mount để SSR và client render lần đầu khớp nhau.
  const [speechOk, setSpeechOk] = useState(false);
  useEffect(() => setSpeechOk(isSpeechAvailable()), []);

  // Chuyển đoạn (không remount): reset state đọc, tắt speech, và với user
  // reduced-motion thì hiện đủ bản dịch ngay (cũng giữ SSR/client khớp nhau).
  useEffect(() => {
    setExplainOn(false);
    setDrawerIndex(null);
    setDrawerClosing(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    stopSpeech();
    if (prefersReducedMotion()) typing.skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.id]);

  useEffect(() => {
    saveProgress({ bookId: book.id, chapterId, passageIndex });
  }, [book.id, chapterId, passageIndex]);

  useEffect(() => () => stopSpeech(), []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Đóng drawer có animation trượt ra: đánh dấu closing, chờ transition xong mới unmount
  const requestCloseDrawer = () => {
    if (drawerIndex === null || drawerClosing) return;
    setDrawerClosing(true);
    closeTimer.current = setTimeout(() => {
      setDrawerIndex(null);
      setDrawerClosing(false);
    }, prefersReducedMotion() ? 0 : 300);
  };

  const goTo = useCallback(
    (i: number) => {
      if (i >= 1 && i <= passageCount) router.push(`/read/${book.id}/${chapterId}/${i}`);
    },
    [book.id, chapterId, passageCount, router],
  );

  // Bấm chuột vào nút xong thì nhả focus: nút còn giữ focus thì Enter lại bấm nút đó thay vì sang đoạn.
  // Bấm bằng bàn phím (detail = 0) thì giữ nguyên để người dùng bàn phím không mất chỗ.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0 || !(e.target instanceof Element)) return;
      const btn = e.target.closest("button");
      if (btn && document.activeElement === btn) btn.blur();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Enter trên nút đang focus là việc của nút đó, phím tắt không xen vào
      if (e.key === "Enter" && e.target instanceof Element && e.target.closest("button")) return;
      if (!typing.done && e.key !== "Escape") {
        typing.skip();
        return;
      }
      if (drawerIndex !== null) {
        if (drawerClosing) return;
        if (e.key === "Escape") requestCloseDrawer();
        if (e.key === "j") setDrawerIndex(Math.min(passage.chunks.length - 1, drawerIndex + 1));
        if (e.key === "k") setDrawerIndex(Math.max(0, drawerIndex - 1));
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
        case "t":
          toggleTheme();
          break;
        case "Escape":
          setExplainOn(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typing, drawerIndex, drawerClosing, passageIndex, goTo, passage, toggleTheme]);

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
          takeiteasy — {book.id} / {chapterLabel(chapterId)} · đoạn {passageIndex}/{passageCount}
          {explainOn && <span className="text-ink"> · explain</span>}
        </div>
        <div className="w-14 shrink-0" />
      </header>

      <div ref={readerRef} data-testid="reader" className="relative grid grow grid-cols-[200px_1fr_200px_1fr] overflow-x-clip px-8 py-12">
        <div aria-hidden="true" />
        <div key={passage.id} ref={originalColRef} data-testid="original-col" className="animate-passage-in relative pr-6">
          <div className="mb-6 text-[13px] text-muted">
            {"// nguyên văn"}
            {explainOn && <span className="ml-3 text-ink">{passage.chunks.length} chunks đáng học</span>}
          </div>
          <OriginalText passage={passage} explainOn={explainOn} onChunkClick={openChunk} />
          <SpeechTooltip containerRef={originalColRef} />
          {passage.sketch && (
            <PassageSketch key={passage.id} sketch={passage.sketch} passageId={passage.id} start={typing.done} dimmed={explainOn} />
          )}
        </div>
        <div aria-hidden="true" className="border-r border-line" />
        <div
          key={`${passage.id}-vi`}
          data-testid="translation-col"
          className={`animate-passage-in pl-12 transition-opacity ${explainOn ? "opacity-30" : ""}`}
          onClick={() => typing.skip()}
        >
          <div className="mb-6 flex items-baseline gap-3 text-[13px]">
            <span className="text-muted">{"// bản dịch"}</span>
            {!typing.done && <span className="text-xs text-accent">đang gõ…</span>}
          </div>
          <div className="whitespace-pre-line text-[15.5px] leading-[2]">
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
        {drawerIndex !== null && (
          <ChunkDrawer
            chunks={passage.chunks}
            index={drawerIndex}
            closing={drawerClosing}
            onNavigate={setDrawerIndex}
            onClose={requestCloseDrawer}
          />
        )}
      </div>

      <FirstTimeHint explainOn={explainOn} />
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-line px-8 text-[13px] text-muted">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setExplainOn((v) => !v)}
            className={`flex items-center gap-2 border px-3 py-1.5 transition-colors ${explainOn ? "border-ink text-ink" : "border-line hover:border-accent hover:text-bright"}`}
          >
            <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">e</kbd> giải thích
          </button>
          <button
            type="button"
            onClick={() => speak(passage.original)}
            disabled={!speechOk}
            title={speechOk ? undefined : "trình duyệt không hỗ trợ đọc"}
            className="flex items-center gap-2 border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-bright disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
          >
            <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">s</kbd> đọc to
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-bright"
          >
            <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">t</kbd> theme
          </button>
          <button
            type="button"
            onClick={() => goTo(passageIndex + 1)}
            disabled={passageIndex >= passageCount}
            className="flex items-center gap-2 border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-bright disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
          >
            <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">enter</kbd> đoạn tiếp
          </button>
        </div>
        <div className="h-1 w-44 rounded bg-line">
          <div
            className="h-full rounded bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${(passageIndex / passageCount) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-4">
          <span>{chapterLabel(chapterId)} · {passageIndex}/{passageCount}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(passageIndex - 1)}
              disabled={passageIndex <= 1}
              className="border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-bright disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
            >
              ← trước
            </button>
            <button
              type="button"
              onClick={() => goTo(passageIndex + 1)}
              disabled={passageIndex >= passageCount}
              className="border border-line px-3 py-1.5 transition-colors hover:border-accent hover:text-bright disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
            >
              tiếp →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
