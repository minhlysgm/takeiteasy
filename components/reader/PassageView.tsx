"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Book, Passage } from "@/content/types";
import { audioPath } from "@/lib/audio/audioPath";
import { stopPlayback, togglePlay, usePlaying } from "@/lib/audio/player";
import { useVoice } from "@/lib/audio/voicePref";
import { DOCK_QUERY } from "@/lib/breakpoints";
import { chapterLabel, type PassageOutline } from "@/lib/content";
import { fetchLookup } from "@/lib/lookupClient";
import { prefersReducedMotion } from "@/lib/motion";
import { saveProgress } from "@/lib/progress";
import { isSketchSeen, sketchGateCss } from "@/lib/sketchSeen";
import { getReadPassages, markPassageRead } from "@/lib/readPassages";
import { chunkAt } from "@/lib/selection";
import { isSpeechAvailable } from "@/lib/speech";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useTextSelection } from "@/lib/useTextSelection";
import { useTheme } from "@/lib/useTheme";
import { useTypingText } from "@/lib/useTypingText";
import { AnnotationLayer } from "./AnnotationLayer";
import { ChunkDrawer } from "./ChunkDrawer";
import { FirstTimeHint } from "./FirstTimeHint";
import { FooterButton } from "./FooterButton";
import { Kbd } from "./Kbd";
import type { LookupState } from "./LookupCard";
import { MobileNoteList } from "./MobileNoteList";
import { CaptionText } from "./CaptionText";
import { CreditLine } from "./CreditLine";
import { PassageJumpList } from "./PassageJumpList";
import { PassageSketch, type SketchDone, type SketchHandle } from "./PassageSketch";
import { SelectionDock } from "./SelectionDock";
import { SelectionPopup } from "./SelectionPopup";

// Phím bổ trợ / phím khoá đứng một mình: không phải phím tắt, cũng không tính là "phím bất kỳ" để hiện thẻ
const IGNORED_KEYS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "OS", "Fn", "FnLock", "CapsLock", "NumLock", "ScrollLock", "ContextMenu"]);
// Phím cuộn của trình duyệt mà app không dùng (Home/End xét riêng: chỉ là phím cuộn khi đang ở thẻ đầu/cuối)
const SCROLL_KEYS = new Set(["PageUp", "PageDown", "ArrowUp", "ArrowDown"]);

interface Props {
  book: Book;
  chapterId: string;
  passage: Passage;
  passageIndex: number; // 1-based
  passageCount: number;
  /** Câu mở đầu của mọi đoạn trong chương — cho danh sách đoạn */
  outline: PassageOutline[];
  /** "Chương 1 · Don't Try" */
  chapterTitle: string;
}

export function PassageView({ book, chapterId, passage, passageIndex, passageCount, outline, chapterTitle }: Props) {
  const router = useRouter();
  const [explainOn, setExplainOn] = useState(false);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  const [drawerClosing, setDrawerClosing] = useState(false);
  // Danh sách đoạn (nhảy tới đoạn bất kỳ). `read` đọc lại từ localStorage mỗi lần mở.
  const [jumpOpen, setJumpOpen] = useState(false);
  const [read, setRead] = useState<number[]>([]);
  const jumpTriggerRef = useRef<HTMLButtonElement>(null);
  const jumpTriggerMobileRef = useRef<HTMLButtonElement>(null);
  // Đóng bằng phím (g / Esc) → focus về bộ đếm. Tab ra ngoài → focus yên chỗ vừa tới. Còn lại (chọn đoạn,
  // bấm chuột ra ngoài / ✕, back/forward) → không trả focus: phần tử đang focus trong danh sách bị gỡ → về body,
  // để enter lại là "đoạn tiếp" (cùng luật "bấm chuột vào nút xong thì nhả focus").
  const jumpFocusTrigger = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const captionColRef = useRef<HTMLDivElement>(null);
  const captionTextRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<SketchHandle>(null);
  const { toggle: toggleTheme } = useTheme();
  // Chỉ chữ trong đoạn mô tả mới tính: nhãn, ghi chú tay, hình minh hoạ cùng cột thì không.
  const { selection, clear: clearSelection } = useTextSelection(captionTextRef, { resetKey: passage.id });
  // Màn hẹp hoặc cảm ứng → thanh dính trên footer; còn lại → popup nổi cạnh vùng chọn.
  const docked = useMediaQuery(DOCK_QUERY);
  // Tấm/ngăn giải thích đang mở thì không hiện thanh/popup chọn chữ.
  const showSel = selection !== null && drawerIndex === null;
  // Đọc khả năng speech sau mount để SSR và client render lần đầu khớp nhau.
  const [speechOk, setSpeechOk] = useState(false);
  useEffect(() => setSpeechOk(isSpeechAvailable()), []);
  // "đọc to" phát file audio của giọng đang chọn (file lỗi thì bộ phát tự lui về giọng trình duyệt).
  const voice = useVoice();
  const playing = usePlaying();
  const capKey = `caption:${passage.id}`;
  // Thẻ tra nghĩa gắn với đúng vùng chọn đã bấm "tra nghĩa" (kể cả đoạn): vùng chọn đổi / mất → thẻ thôi hiện.
  const [lookup, setLookup] = useState<{ key: string; state: LookupState } | null>(null);
  const lookupAbort = useRef<AbortController | null>(null);
  // Mỗi lần huỷ tăng một số: phản hồi về muộn của lượt cũ bị bỏ qua kể cả khi abort chưa kịp có tác dụng.
  const lookupSeq = useRef(0);
  const selectionKey = selection ? `${passage.id}:${selection.start}-${selection.end}` : null;
  const shownLookup = lookup !== null && lookup.key === selectionKey ? lookup.state : null;
  const cancelLookup = useCallback(() => {
    lookupSeq.current++;
    lookupAbort.current?.abort();
    lookupAbort.current = null;
  }, []);
  const closeLookup = useCallback(() => {
    cancelLookup();
    setLookup(null);
  }, [cancelLookup]);
  // Vùng chọn rời khỏi chữ đang tra (bôi chữ khác, bỏ chọn, Esc, bấm ra ngoài) → huỷ request, bỏ thẻ.
  const lookupKey = lookup?.key ?? null;
  useEffect(() => {
    if (lookupKey !== null && lookupKey !== selectionKey) closeLookup();
  }, [lookupKey, selectionKey, closeLookup]);

  // Chuyển đoạn: PassageView nằm ở layout của chương nên KHÔNG remount. State của đoạn được đặt lại
  // ngay trong lúc vẽ (không đợi effect) để đoạn mới không vẽ lần nào với tấm giải thích / chế độ
  // giải thích của đoạn cũ.
  // Thẻ "vẽ trước": "none" = hình đang chờ/vẽ, mô tả + bản dịch chưa hiện; "animate" = vừa vẽ xong trước mắt
  // người đọc → mô tả hiện dần, bản dịch gõ; "instant" = hiện đủ ngay (thẻ đã xem, reduced-motion, phím/giải thích).
  // "pending" = chưa biết (HTML server + lần render hydrate, vì localStorage chỉ có ở client): dựng cả chỗ chờ lẫn
  // nội dung đủ, CSS chọn (xem sketchGateCss); layout effect bên dưới quyết trước khi trình duyệt vẽ khung đầu.
  const [reveal, setReveal] = useState<"pending" | "none" | SketchDone>("pending");
  const pending = reveal === "pending";
  const waiting = reveal === "none" || pending;
  useLayoutEffect(() => {
    setReveal((r) => (r === "pending" ? (isSketchSeen(passage.id) || prefersReducedMotion() ? "instant" : "none") : r));
    // Chỉ lúc mở: chuyển thẻ sau đó được đặt lại ngay trong lúc render (khối bên dưới)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [shownId, setShownId] = useState(passage.id);
  if (shownId !== passage.id) {
    setShownId(passage.id);
    // Chuyển thẻ chỉ xảy ra ở client: thẻ đã xem / reduced-motion thì hiện đủ ngay từ lần vẽ đầu, để trang không
    // co lại một khung (back/forward khôi phục chỗ cuộn lúc đó sẽ bị kéo về đầu). Lần tải trang đầu là "pending".
    setReveal(isSketchSeen(passage.id) || prefersReducedMotion() ? "instant" : "none");
    setExplainOn(false);
    setDrawerIndex(null);
    setDrawerClosing(false);
    setJumpOpen(false); // gỡ danh sách → hook của nó trả focus + mở khoá cuộn (cả khi back/forward)
    setLookup(null); // request đang chờ được huỷ ở effect bên dưới
  }
  // Gọi sau khối đặt lại ở trên. Ở lượt render này `reveal` vẫn là giá trị của thẻ cũ; React render lại ngay sau
  // setState-trong-render. Từ thẻ "instant" sang thẻ chưa xem, lượt đầu còn `enabled:false` nên hook lưu chữ mới ở
  // độ dài đủ, và lượt commit với reveal = "none" có `typing.done === true` cho tới khi effect của hook đặt lại về 0.
  // Vô hại: nhánh "none" không render `typing`, và trình xử lý phím kiểm `reveal` trước `typing.done`.
  // Không gọi typing.skip() khi reveal = "none": lúc start bật lại sẽ loé đủ chữ rồi mới gõ lại từ đầu.
  const typing = useTypingText(passage.translation, { start: reveal === "animate", enabled: reveal !== "instant" && !pending });

  // Hình báo xong: chỉ nhận lần đầu của thẻ (vẽ lại xong thì bản dịch không gõ lại).
  const onSketchDone = useCallback((how: SketchDone) => setReveal((r) => (r === "none" || r === "pending" ? how : r)), []);
  // Phím / "giải thích" lúc hình chưa xong: hiện đủ ngay — hình báo về "instant" (không hiện dần, không gõ).
  // Tự đặt luôn phòng khi hình đã xong từ trước (finish() khi đó không báo gì nữa).
  const revealNow = useCallback(() => {
    sketchRef.current?.finish("instant");
    setReveal((r) => (r === "none" ? "instant" : r));
  }, []);

  const toggleReadAloud = useCallback(
    () => togglePlay(capKey, { text: passage.caption, src: audioPath(voice, passage.caption) }),
    [capKey, passage.caption, voice],
  );

  // Việc ngoài React khi chuyển đoạn: huỷ hẹn giờ đóng tấm, tắt speech, bỏ vùng chọn của trình duyệt
  // (cả khi chuyển bằng back/forward). Reduced-motion: hình báo "instant" nên bản dịch hiện đủ ngay.
  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    stopPlayback();
    cancelLookup();
    clearSelection();
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
    markPassageRead(book.id, chapterId, passageIndex);
  }, [book.id, chapterId, passageIndex]);

  useEffect(() => () => stopPlayback(), []);
  useEffect(() => cancelLookup, [cancelLookup]);
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
      if (i < 1 || i > passageCount || i === passageIndex) return;
      clearSelection();
      scrollTopOnChange.current = true;
      router.push(`/read/${book.id}/${chapterId}/${i}`);
    },
    [book.id, chapterId, passageIndex, passageCount, router, clearSelection],
  );

  const openJump = useCallback(() => {
    clearSelection();
    // Desktop: footer vẫn bấm được khi ngăn giải thích mở → đóng ngay, không để hai lớp nổi chồng nhau.
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDrawerIndex(null);
    setDrawerClosing(false);
    setRead(getReadPassages(book.id, chapterId));
    jumpFocusTrigger.current = false;
    setJumpOpen(true);
  }, [book.id, chapterId, clearSelection]);

  const closeJump = useCallback((focusTrigger: boolean) => {
    jumpFocusTrigger.current = focusTrigger;
    setJumpOpen(false);
  }, []);

  const pickPassage = (i: number) => {
    closeJump(false);
    goTo(i);
  };

  // Danh sách gọi lúc unmount. Không cuộn trang: header mobile không dính, focus() thường sẽ kéo trang lên đầu.
  const jumpRestoreTarget = useCallback(
    () =>
      jumpFocusTrigger.current
        ? ([jumpTriggerRef.current, jumpTriggerMobileRef.current].find((b) => b && b.getClientRects().length > 0) ?? null)
        : null,
    [],
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
      // Phím của trình duyệt / hệ điều hành (tổ hợp Ctrl/Meta/Alt, phím bổ trợ đứng một mình, F1–F12): không đụng tới
      if (e.metaKey || e.ctrlKey || e.altKey || IGNORED_KEYS.has(e.key) || /^F([1-9]|1[0-2])$/.test(e.key)) return;
      // Shift+←/→/Home/End là phím nới vùng chọn của trình duyệt, không phải chuyển đoạn
      if (e.shiftKey && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      // Enter trên nút đang focus là việc của nút đó, phím tắt không xen vào
      if (e.key === "Enter" && e.target instanceof Element && e.target.closest("button")) return;
      // Danh sách đoạn / tấm giải thích đang mở: phím là của chúng, kể cả lúc hình chưa xong hay bản dịch đang gõ
      if (drawerIndex !== null || jumpOpen) {
        if (drawerIndex !== null) {
          if (drawerClosing) return;
          if (e.key === "Escape") requestCloseDrawer();
          if (e.key === "j") setDrawerIndex(Math.min(passage.chunks.length - 1, drawerIndex + 1));
          if (e.key === "k") setDrawerIndex(Math.max(0, drawerIndex - 1));
          return;
        }
        // Danh sách đoạn: g đóng. Phím khác (Esc, ↑/↓, enter) để danh sách tự lo,
        // không chuyển đoạn hay tắt giải thích phía sau.
        if (e.key === "g") closeJump(true);
        return;
      }
      // Phím cuộn không phải phím tắt của app (Home ở thẻ đầu, End ở thẻ cuối): để trình duyệt cuộn
      const scrollKey =
        SCROLL_KEYS.has(e.key) || (e.key === "Home" && passageIndex === 1) || (e.key === "End" && passageIndex === passageCount);
      // Hình chưa xong: phím bất kỳ (trừ Esc, phím cuộn) = hiện đủ ngay, chưa làm việc của phím (enter lần 2 mới sang
      // thẻ). Phím cuộn thì như lăn chuột: hình đang chờ lọt khung vẫn được vẽ khi cuộn tới.
      // Tab vẫn để trình duyệt chuyển focus; Space trên nút đang focus thì để nút tự bấm (như Enter ở trên).
      if (reveal === "none") {
        if (e.key === "Escape" || scrollKey) return;
        revealNow();
        // Ngoại lệ: nút trong hình ("xem ngay ⏭") đổi thành "↻ vẽ lại" ngay khi hiện đủ, nên để Space bấm tiếp là vẽ lại.
        const spaceOnButton =
          e.key === " " && e.target instanceof Element && !!e.target.closest("button") && !e.target.closest('[data-testid="sketch"]');
        if (e.key !== "Tab" && !spaceOnButton) e.preventDefault();
        return;
      }
      if (!typing.done && e.key !== "Escape") {
        typing.skip();
        return;
      }
      switch (e.key) {
        case "g":
          openJump();
          break;
        // Đang ở đoạn đầu/cuối thì để Home/End là phím cuộn của trình duyệt
        case "Home":
          if (passageIndex === 1) break;
          e.preventDefault();
          goTo(1);
          break;
        case "End":
          if (passageIndex === passageCount) break;
          e.preventDefault();
          goTo(passageCount);
          break;
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
          toggleReadAloud();
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
  }, [reveal, revealNow, typing, drawerIndex, drawerClosing, jumpOpen, openJump, closeJump, passageIndex, passageCount, goTo, passage, toggleTheme, toggleReadAloud, requestCloseDrawer, clearSelection]);

  const openChunk = (chunkId: string) => {
    const i = passage.chunks.findIndex((c) => c.id === chunkId);
    if (i < 0) return;
    // Bấm vào cụm cũng có thể vừa bôi đen chữ (nhấp đúp): bỏ luôn, kẻo đóng tấm lại hiện popup cũ.
    clearSelection();
    setDrawerIndex(i);
  };

  const lookUp = () => {
    if (!selection) return;
    const { text, start, end } = selection;
    const chunk = chunkAt(passage, start, end);
    if (chunk) {
      openChunk(chunk.id); // cụm soạn sẵn: dữ liệu biên tập có rồi, không gọi AI
      return;
    }
    // Thẻ của chính vùng chọn này đang mở (chờ hoặc đã có kết quả) → bấm lần nữa là đóng.
    if (shownLookup !== null) {
      closeLookup();
      return;
    }
    cancelLookup();
    const ctrl = new AbortController();
    const seq = lookupSeq.current;
    const key = `${passage.id}:${start}-${end}`;
    lookupAbort.current = ctrl;
    setLookup({ key, state: { phase: "loading" } });
    fetchLookup(
      { bookId: book.id, chapterId, passageIndex, text, start, end },
      ctrl.signal,
    ).then(
      (res) => {
        if (seq !== lookupSeq.current) return;
        setLookup({ key, state: res.status === "ok" ? { phase: "ok", result: res.result } : { phase: "error" } });
      },
      () => {}, // chỉ ném khi bị huỷ (AbortError): lượt đó đã bị thay / bỏ
    );
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {pending && <style dangerouslySetInnerHTML={{ __html: sketchGateCss(passage.id) }} />}
      <header className="flex h-11 shrink-0 items-center border-b border-line bg-surface lg:sticky lg:top-0 lg:z-[15] lg:gap-4 lg:px-5">
        {/* Mobile: ô trống trái cân với nút theme bên phải để tiêu đề nằm giữa */}
        <div className="w-11 shrink-0 lg:hidden" aria-hidden="true" />
        <div className="hidden gap-2 lg:flex" aria-hidden="true">
          <span className="block h-3 w-3 rounded-full bg-danger opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-ink opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-accent opacity-70" />
        </div>
        <div className="min-w-0 grow truncate text-center text-[13px] text-muted">
          {/* Mobile: tiêu đề là nút mở danh sách thẻ. Desktop: chữ thường như cũ (nút ở footer). */}
          <button
            ref={jumpTriggerMobileRef}
            type="button"
            data-testid="jump-trigger-mobile"
            aria-haspopup="dialog"
            aria-expanded={jumpOpen}
            onClick={openJump}
            className="inline-flex h-11 max-w-full items-center gap-1.5 px-0.5 align-top text-bright focus-visible:outline-offset-[-4px] lg:hidden"
          >
            <span className="truncate">
              {chapterLabel(chapterId)} · thẻ {passageIndex}/{passageCount}
              {explainOn && <span className="text-ink"> · explain</span>}
            </span>
            {/* < 360px mà bật giải thích thì không đủ chỗ cho cả "· explain" lẫn ▾ (font mono 13px): nhường cho chữ */}
            <span aria-hidden="true" className={`shrink-0 text-muted ${explainOn ? "max-[359.98px]:hidden" : ""}`}>▾</span>
          </button>
          <span className="hidden lg:inline">
            takeiteasy — {book.id} / {chapterLabel(chapterId)} · thẻ {passageIndex}/{passageCount}
            {explainOn && <span className="text-ink"> · explain</span>}
          </span>
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

      <div ref={readerRef} data-testid="reader" data-sketch-gate={pending ? "" : undefined} className="relative flex grow flex-col overflow-x-clip px-4 py-6 lg:px-8 lg:py-12 2col:grid 2col:grid-cols-[200px_1fr_200px_1fr]">
        {/* Dưới 1440px: một cột giữa như tablet (hình → mô tả → bản dịch), ghi chú giải thích nằm hai lề. Từ 1440px: lề | mô tả | rãnh | bản dịch */}
        <div aria-hidden="true" className="hidden 2col:block" />
        <div key={passage.id} ref={captionColRef} data-testid="caption-col" className="animate-passage-in relative mx-auto w-full max-w-[40rem] pr-0 2col:mx-0 2col:max-w-none 2col:pr-6">
          {/* Div cha key theo thẻ → hình mount lại mỗi thẻ */}
          <PassageSketch
            ref={sketchRef}
            sketch={passage.sketch}
            passageId={passage.id}
            dimmed={explainOn}
            onDone={onSketchDone}
          />
          <div className="mb-6 mt-8 text-[13px] text-muted">
            {"// mô tả"}
            {explainOn && <span className="ml-3 text-ink">{passage.chunks.length} chunks đáng học</span>}
          </div>
          {waiting && (
            <p data-testid="caption-waiting" aria-hidden="true" className="gate-wait text-[13px] text-muted">
              mô tả hiện sau khi vẽ xong.
            </p>
          )}
          {/* Luôn render (giữ ref cho bôi đen chữ), chỉ ẩn khi hình chưa xong */}
          <div
            hidden={reveal === "none"}
            className={reveal === "animate" ? "animate-caption-in motion-reduce:animate-none" : pending ? "gate-full" : undefined}
          >
            <CaptionText ref={captionTextRef} passage={passage} explainOn={explainOn} onChunkClick={openChunk} />
          </div>
          {explainOn && <MobileNoteList chunks={passage.chunks} onChunkClick={openChunk} />}
          {showSel && !docked && (
            <SelectionPopup
              selection={selection}
              containerRef={captionColRef}
              speechOk={speechOk}
              lookup={shownLookup}
              onLookUp={lookUp}
              onCloseLookup={closeLookup}
            />
          )}
        </div>
        <div aria-hidden="true" className="hidden border-r border-line 2col:block" />
        <div
          key={`${passage.id}-vi`}
          data-testid="translation-col"
          className={`animate-passage-in mx-auto mt-7 w-full max-w-[40rem] border-t border-line pt-6 transition-opacity motion-reduce:transition-none 2col:mx-0 2col:mt-0 2col:max-w-none 2col:border-t-0 2col:pt-0 2col:pl-12 ${explainOn ? "lg:opacity-30" : ""}`}
          onClick={() => reveal !== "none" && typing.skip()}
        >
          {/* Nhãn luôn có, kể cả lúc chờ vẽ: vẽ xong thì chỉ phần dưới nhãn đổi, cột không nhảy */}
          <div className="mb-6 flex items-baseline gap-3 text-[13px]">
            <span className="text-muted">{"// bản dịch"}</span>
            {reveal !== "none" && !typing.done && <span className="text-xs text-accent">đang gõ…</span>}
          </div>
          {waiting && (
            <p data-testid="translation-waiting" className="gate-wait text-[13px] text-muted">
              bản dịch hiện sau khi vẽ xong.
            </p>
          )}
          {reveal !== "none" && (
            <div className={pending ? "gate-full" : undefined}>
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
              {typing.done && <CreditLine book={book} chapterId={chapterId} />}
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
        {showSel && docked && (
          <SelectionDock
            selection={selection}
            speechOk={speechOk}
            lookup={shownLookup}
            onLookUp={lookUp}
            onCloseLookup={closeLookup}
          />
        )}
        {/* Thanh đang hiện thì mẹo tạm nhường chỗ (màn nhỏ: mẹo + thanh + footer chiếm gần nửa màn) */}
        <FirstTimeHint explainOn={explainOn} hidden={(showSel && docked) || jumpOpen} />
        <footer className="relative flex [&_button:focus-visible]:outline-offset-1 h-[60px] shrink-0 items-center justify-between gap-1.5 border-t border-line bg-bg px-2 text-[13px] text-muted lg:h-14 lg:gap-0 lg:px-8">
          <div
            aria-hidden
            data-testid="mobile-progress"
            className="absolute -top-px left-0 h-0.5 w-full origin-left bg-accent transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden"
            style={{ transform: `scaleX(${passageIndex / passageCount})` }}
          />
          <div className="flex items-center gap-1.5 lg:gap-2.5">
            <FooterButton
              active={explainOn}
              onClick={() => {
                if (reveal === "none") revealNow();
                setExplainOn((v) => !v);
              }}
            >
              <Kbd className="max-lg:hidden">e</Kbd> giải thích
            </FooterButton>
            <FooterButton
              active={playing === capKey}
              onClick={() => {
                if (reveal === "none") revealNow();
                toggleReadAloud();
              }}
            >
              <Kbd className="max-lg:hidden">s</Kbd> {playing === capKey ? "■ dừng" : "đọc to"}
            </FooterButton>
            <FooterButton desktopOnly onClick={toggleTheme}>
              <Kbd>t</Kbd> theme
            </FooterButton>
            <FooterButton desktopOnly onClick={() => goTo(passageIndex + 1)} disabled={passageIndex >= passageCount}>
              <Kbd>enter</Kbd> thẻ tiếp
            </FooterButton>
          </div>
          <div className="hidden h-1 w-44 rounded bg-line lg:block">
            <div
              data-testid="desktop-progress"
              className="h-full w-full origin-left rounded bg-accent transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${passageIndex / passageCount})` }}
            />
          </div>
          <div className="flex items-center gap-4">
            <FooterButton
              ref={jumpTriggerRef}
              desktopOnly
              active={jumpOpen}
              data-testid="jump-trigger"
              aria-haspopup="dialog"
              aria-expanded={jumpOpen}
              onClick={openJump}
            >
              <Kbd>g</Kbd> {chapterLabel(chapterId)} · {passageIndex}/{passageCount} <span aria-hidden="true">▾</span>
            </FooterButton>
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

      {jumpOpen && (
        <PassageJumpList
          title={chapterTitle}
          outline={outline}
          current={passageIndex}
          read={read}
          onPick={pickPassage}
          onClose={(how) => closeJump(how === "key")}
          restoreFocus={jumpRestoreTarget}
        />
      )}
    </div>
  );
}
