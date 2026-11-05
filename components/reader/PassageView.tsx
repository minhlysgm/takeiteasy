"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Book, Passage } from "@/content/types";
import { DOCK_QUERY } from "@/lib/breakpoints";
import { chapterLabel } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/motion";
import { saveProgress } from "@/lib/progress";
import { isSpeechAvailable, speak, stopSpeech } from "@/lib/speech";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useTextSelection } from "@/lib/useTextSelection";
import { useTheme } from "@/lib/useTheme";
import { useTypingText } from "@/lib/useTypingText";
import { AnnotationLayer } from "./AnnotationLayer";
import { ChunkDrawer } from "./ChunkDrawer";
import { FirstTimeHint } from "./FirstTimeHint";
import { FooterButton } from "./FooterButton";
import { Kbd } from "./Kbd";
import { MobileNoteList } from "./MobileNoteList";
import { OriginalText } from "./OriginalText";
import { PassageSketch } from "./PassageSketch";
import { SelectionDock } from "./SelectionDock";
import { SelectionPopup } from "./SelectionPopup";

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
  const originalTextRef = useRef<HTMLDivElement>(null);
  const typing = useTypingText(passage.translation);
  const { toggle: toggleTheme } = useTheme();
  // Chỉ chữ nguyên văn mới tính: nhãn, ghi chú tay, hình minh hoạ cùng cột thì không.
  const { selection, clear: clearSelection } = useTextSelection(originalTextRef, { resetKey: passage.id });
  // Màn hẹp hoặc cảm ứng → thanh dính trên footer; còn lại → popup nổi cạnh vùng chọn.
  const docked = useMediaQuery(DOCK_QUERY);
  // Tấm/ngăn giải thích đang mở thì không hiện thanh/popup chọn chữ.
  const showSel = selection !== null && drawerIndex === null;
  // Đọc khả năng speech sau mount để SSR và client render lần đầu khớp nhau.
  const [speechOk, setSpeechOk] = useState(false);
  useEffect(() => setSpeechOk(isSpeechAvailable()), []);

  // Chuyển đoạn: PassageView nằm ở layout của chương nên KHÔNG remount. State của đoạn được đặt lại
  // ngay trong lúc vẽ (không đợi effect) để đoạn mới không vẽ lần nào với tấm giải thích / chế độ
  // giải thích của đoạn cũ.
  const [shownId, setShownId] = useState(passage.id);
  if (shownId !== passage.id) {
    setShownId(passage.id);
    setExplainOn(false);
    setDrawerIndex(null);
    setDrawerClosing(false);
  }

  // Việc ngoài React khi chuyển đoạn: huỷ hẹn giờ đóng tấm, tắt speech, bỏ vùng chọn của trình duyệt
  // (cả khi chuyển bằng back/forward), và với user reduced-motion thì hiện đủ bản dịch ngay.
  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    stopSpeech();
    clearSelection();
    if (prefersReducedMotion()) typing.skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.id]);

  // Sang đoạn bằng nút/phím của app → về đầu trang trước khi vẽ (Next chỉ tự cuộn khi dựng lại page).
  // Back/forward thì để trình duyệt khôi phục chỗ đang đọc.
  const scrollTopOnChange = useRef(false);
  useLayoutEffect(() => {
    if (!scrollTopOnChange.current) return;
    scrollTopOnChange.current = false;
    window.scrollTo(0, 0);
  }, [passage.id]);

  useEffect(() => {
    saveProgress({ bookId: book.id, chapterId, passageIndex });
  }, [book.id, chapterId, passageIndex]);

  useEffect(() => () => stopSpeech(), []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Đóng drawer có animation trượt ra: đánh dấu closing, chờ transition xong mới unmount
  const requestCloseDrawer = useCallback(() => {
    if (drawerIndex === null || drawerClosing) return;
    setDrawerClosing(true);
    closeTimer.current = setTimeout(() => {
      setDrawerIndex(null);
      setDrawerClosing(false);
    }, prefersReducedMotion() ? 0 : 300);
  }, [drawerIndex, drawerClosing]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 1 || i > passageCount) return;
      clearSelection();
      scrollTopOnChange.current = true;
      router.push(`/read/${book.id}/${chapterId}/${i}`);
    },
    [book.id, chapterId, passageCount, router, clearSelection],
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
      // Shift+←/→ là phím nới vùng chọn của trình duyệt, không phải chuyển đoạn
      if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
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
          clearSelection();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typing, drawerIndex, drawerClosing, passageIndex, goTo, passage, toggleTheme, requestCloseDrawer, clearSelection]);

  const openChunk = (chunkId: string) => {
    const i = passage.chunks.findIndex((c) => c.id === chunkId);
    if (i < 0) return;
    // Bấm vào cụm cũng có thể vừa bôi đen chữ (nhấp đúp): bỏ luôn, kẻo đóng tấm lại hiện popup cũ.
    clearSelection();
    setDrawerIndex(i);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-11 shrink-0 items-center border-b border-line bg-surface lg:sticky lg:top-0 lg:z-[15] lg:gap-4 lg:px-5">
        {/* Mobile: ô trống trái cân với nút theme bên phải để tiêu đề nằm giữa */}
        <div className="w-11 shrink-0 lg:hidden" aria-hidden="true" />
        <div className="hidden gap-2 lg:flex" aria-hidden="true">
          <span className="block h-3 w-3 rounded-full bg-danger opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-ink opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-accent opacity-70" />
        </div>
        <div className="min-w-0 grow truncate text-center text-[13px] text-muted">
          <span className="hidden lg:inline">takeiteasy — {book.id} / </span>{chapterLabel(chapterId)} · đoạn {passageIndex}/{passageCount}
          {explainOn && <span className="text-ink"> · explain</span>}
        </div>
        <div className="hidden w-14 shrink-0 lg:block" />
        {/* Mobile: theme ở header cho footer đủ chỗ ở 320px; desktop vẫn ở footer (phím t) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-bright motion-reduce:transition-none focus-visible:outline-offset-[-4px] lg:hidden"
        >
          <svg aria-hidden viewBox="0 0 16 16" width="16" height="16">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" />
          </svg>
          <span className="sr-only">theme</span>
        </button>
      </header>

      <div ref={readerRef} data-testid="reader" className="relative flex grow flex-col overflow-x-clip px-4 py-6 lg:grid lg:grid-cols-[200px_1fr_200px_1fr] lg:px-8 lg:py-12">
        <div aria-hidden="true" className="hidden lg:block" />
        <div key={passage.id} ref={originalColRef} data-testid="original-col" className="animate-passage-in relative mx-auto w-full max-w-[40rem] pr-0 lg:mx-0 lg:max-w-none lg:pr-6">
          <div className="mb-6 text-[13px] text-muted">
            {"// nguyên văn"}
            {explainOn && <span className="ml-3 text-ink">{passage.chunks.length} chunks đáng học</span>}
          </div>
          <OriginalText ref={originalTextRef} passage={passage} explainOn={explainOn} onChunkClick={openChunk} />
          {explainOn && <MobileNoteList chunks={passage.chunks} onChunkClick={openChunk} />}
          {showSel && !docked && <SelectionPopup selection={selection} containerRef={originalColRef} speechOk={speechOk} />}
          {passage.sketch && (
            <PassageSketch key={passage.id} sketch={passage.sketch} passageId={passage.id} start={typing.done} dimmed={explainOn} />
          )}
        </div>
        <div aria-hidden="true" className="hidden border-r border-line lg:block" />
        <div
          key={`${passage.id}-vi`}
          data-testid="translation-col"
          className={`animate-passage-in mx-auto mt-7 w-full max-w-[40rem] border-t border-line pt-6 transition-opacity motion-reduce:transition-none lg:mx-0 lg:mt-0 lg:max-w-none lg:border-t-0 lg:pt-0 lg:pl-12 ${explainOn ? "lg:opacity-30" : ""}`}
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
          <div className="hidden lg:contents">
            <AnnotationLayer containerRef={readerRef} chunks={passage.chunks} onChunkClick={openChunk} />
          </div>
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

      {/* Footer dính đáy màn hình ở mọi cỡ; desktop nằm trên vùng mờ của ngăn giải thích nên vẫn bấm được */}
      {/* Nền surface: khe lẻ pixel giữa các dải không lộ nội dung phía sau */}
      <div className="sticky bottom-0 z-[5] bg-surface lg:z-[15]">
        {showSel && docked && <SelectionDock selection={selection} speechOk={speechOk} />}
        {/* Thanh đang hiện thì mẹo tạm nhường chỗ (màn nhỏ: mẹo + thanh + footer chiếm gần nửa màn) */}
        <FirstTimeHint explainOn={explainOn} hidden={showSel && docked} />
        <footer className="relative flex [&_button:focus-visible]:outline-offset-1 h-[60px] shrink-0 items-center justify-between gap-1.5 border-t border-line bg-bg px-2 text-[13px] text-muted lg:h-14 lg:gap-0 lg:px-8">
          <div
            aria-hidden
            data-testid="mobile-progress"
            className="absolute -top-px left-0 h-0.5 w-full origin-left bg-accent transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden"
            style={{ transform: `scaleX(${passageIndex / passageCount})` }}
          />
          <div className="flex items-center gap-1.5 lg:gap-2.5">
            <FooterButton active={explainOn} onClick={() => setExplainOn((v) => !v)}>
              <Kbd className="max-lg:hidden">e</Kbd> giải thích
            </FooterButton>
            <FooterButton
              onClick={() => speak(passage.original)}
              disabled={!speechOk}
              title={speechOk ? undefined : "trình duyệt không hỗ trợ đọc"}
            >
              <Kbd className="max-lg:hidden">s</Kbd> đọc to
            </FooterButton>
            <FooterButton desktopOnly onClick={toggleTheme}>
              <Kbd>t</Kbd> theme
            </FooterButton>
            <FooterButton desktopOnly onClick={() => goTo(passageIndex + 1)} disabled={passageIndex >= passageCount}>
              <Kbd>enter</Kbd> đoạn tiếp
            </FooterButton>
          </div>
          <div className="hidden h-1 w-44 rounded bg-line lg:block">
            <div
              data-testid="desktop-progress"
              className="h-full rounded bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${(passageIndex / passageCount) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden lg:inline">{chapterLabel(chapterId)} · {passageIndex}/{passageCount}</span>
            <div className="flex gap-2">
              <FooterButton className="min-w-11 lg:min-w-0" onClick={() => goTo(passageIndex - 1)} disabled={passageIndex <= 1}>
                ← <span className="sr-only lg:not-sr-only">trước</span>
              </FooterButton>
              <FooterButton onClick={() => goTo(passageIndex + 1)} disabled={passageIndex >= passageCount}>
                tiếp →
              </FooterButton>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
