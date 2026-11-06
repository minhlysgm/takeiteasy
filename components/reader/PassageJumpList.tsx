"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { PassageOutline } from "@/lib/content";
import { useSheetBehavior } from "@/lib/useSheetBehavior";
import { Kbd } from "./Kbd";

interface Props {
  title: string;
  outline: PassageOutline[];
  /** 1-based */
  current: number;
  /** các đoạn (1-based) đã đọc */
  read: number[];
  onPick: (index: number) => void;
  /**
   * how: đóng bằng chuột/chạm ("pointer"), phím ("key"), hay vì focus đã rời danh sách ("focus-out")
   * — để màn đọc quyết định trả focus về đâu.
   */
  onClose: (how: "pointer" | "key" | "focus-out") => void;
  /** Lúc đóng: focus vào phần tử trả về (không cuộn), null = để focus yên. Mặc định: về chỗ cũ. */
  restoreFocus?: () => HTMLElement | null;
}

/**
 * Danh sách đoạn của chương. Mobile: bottom sheet trượt từ dưới (như ChunkDrawer).
 * Desktop (lg): popover cố định ngay trên footer, góc phải, không trượt.
 */
export function PassageJumpList({ title, outline, current, read, onPick, onClose, restoreFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const sheet = useSheetBehavior(ref, {
    // Mở ra là focus ngay dòng hiện tại (cuộn danh sách tới nó, không cuộn trang)
    initialFocus: () => {
      const row = ref.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? null;
      row?.scrollIntoView?.({ block: "nearest" });
      return row;
    },
    restoreFocus,
  });
  // Chỉ tính các đoạn có trong chương (localStorage có thể còn chỉ số cũ)
  const readIds = new Set(read);
  const readSet = new Set(outline.filter((o) => readIds.has(o.index)).map((o) => o.index));

  // Popover desktop không khoá focus: focus rơi vào chỗ khác ngoài danh sách (Tab ra, kể cả vòng qua đầu trang)
  // thì đóng ("focus-out") và để focus yên ở chỗ vừa tới. Bấm chuột ra ngoài không đổi focus → backdrop lo.
  // Kiểm lại SAU khi focus ổn định: StrictMode (dev) chạy cleanup của useSheetBehavior (trả focus) rồi focus lại khung.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof Node) || ref.current?.contains(e.target)) return;
      queueMicrotask(() => {
        const at = document.activeElement;
        if (ref.current?.isConnected && at && at !== document.body && !ref.current.contains(at)) onCloseRef.current("focus-out");
      });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  // Mount ngoài màn hình rồi flip ở frame kế để transition chạy (giống ChunkDrawer)
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    sheet.onKeyDown(e);
    if (e.key === "Escape") {
      e.preventDefault();
      onClose("key");
      return;
    }
    const rows = Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-testid="jump-row"]') ?? []);
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    let to = -1;
    if (e.key === "ArrowUp") to = Math.max(0, at - 1);
    else if (e.key === "ArrowDown") to = Math.min(rows.length - 1, at + 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = rows.length - 1;
    if (to < 0) return;
    e.preventDefault();
    rows[to].focus();
    rows[to].scrollIntoView?.({ block: "nearest" });
  };

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="jump-backdrop"
        onClick={() => onClose("pointer")}
        className={`fixed inset-0 z-30 bg-scrim transition-opacity duration-300 ease-out motion-reduce:transition-none lg:bg-transparent ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label="danh sách thẻ"
        data-testid="jump-list"
        onKeyDown={onKeyDown}
        className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-x-auto lg:bottom-16 lg:right-8 lg:max-h-[60vh] lg:w-[420px] lg:rounded-lg lg:border lg:transition-none ${entered ? "translate-y-0" : "translate-y-full lg:translate-y-0"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-2 lg:py-3">
          <div className="min-w-0">
            <div className="truncate text-[14px] text-bright">{title}</div>
            <div className="text-[13px] text-muted">
              {readSet.size}/{outline.length} thẻ đã đọc
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => onClose(e.detail === 0 ? "key" : "pointer")}
            aria-label="đóng"
            className="-mr-3 flex min-h-11 min-w-11 shrink-0 items-center justify-center text-text hover:text-bright max-lg:focus-visible:outline-offset-[-8px] lg:hidden"
          >
            <span className="text-[19px] leading-none">✕</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {outline.map((o) => {
            const isCurrent = o.index === current;
            return (
              <button
                key={o.index}
                type="button"
                data-testid="jump-row"
                data-index={o.index}
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onPick(o.index)}
                className={`flex min-h-12 w-full items-center gap-3 border-l-2 px-5 text-left text-[14px] hover:text-bright focus-visible:outline-offset-[-2px] ${isCurrent ? "border-accent bg-accent-soft text-bright" : "border-transparent text-text"}`}
              >
                <span className={`w-6 shrink-0 text-right text-[13px] ${isCurrent ? "text-text" : "text-muted"}`}>{o.index}</span>
                <span className="min-w-0 flex-1 truncate">{o.firstSentence}</span>
                {/* Mobile: viền + nền đã đánh dấu dòng này → nhường chỗ cho câu mở đầu, chữ chỉ còn cho trình đọc màn hình */}
                {isCurrent && <span className="sr-only shrink-0 text-xs text-accent-strong lg:not-sr-only">đang đọc</span>}
                {readSet.has(o.index) && (
                  <>
                    <span aria-hidden="true" className="shrink-0 text-accent">
                      ✓
                    </span>
                    <span className="sr-only">đã đọc</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-xs text-muted lg:flex">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> chọn
          </span>
          <span>
            <Kbd>enter</Kbd> mở thẻ
          </span>
          <span>
            <Kbd>esc</Kbd> đóng
          </span>
          <span>
            <Kbd>home</Kbd>/<Kbd>end</Kbd> thẻ đầu/cuối
          </span>
        </div>
      </div>
    </>
  );
}
