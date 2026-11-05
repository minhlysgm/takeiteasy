"use client";
import { useEffect, useRef, useState } from "react";
import type { Chunk } from "@/content/types";
import { isSpeechAvailable, speak } from "@/lib/speech";
import { Kbd } from "./Kbd";

/** Khớp breakpoint `lg` của Tailwind: dưới mức này giải thích là tấm trượt từ dưới lên. */
const MOBILE_QUERY = "(max-width: 1023.98px)";

interface Props {
  chunks: Chunk[];
  index: number;
  /** true khi đang trượt ra để đóng — PassageView unmount sau khi transition xong */
  closing?: boolean;
  onNavigate: (i: number) => void;
  onClose: () => void;
}

export function ChunkDrawer({ chunks, index, closing = false, onNavigate, onClose }: Props) {
  const chunk = chunks[index];
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sang cụm khác thì vùng cuộn về đầu (không giữ vị trí cuộn của cụm trước)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [index]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);

  // Còn nội dung bên dưới vùng cuộn? (cho dải mờ ở đáy). ResizeObserver báo ngay khi bắt đầu theo dõi,
  // và mỗi khi nội dung đổi cỡ (sang cụm khác, xoay máy); cuộn thì nghe sự kiện scroll.
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [index]);

  // Mount ở vị trí ngoài màn hình rồi flip sang frame kế tiếp để CSS transition
  // chạy hiệu ứng trượt vào (kiểu drawer mobile).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Mobile (< lg): tấm là modal — khoá cuộn trang phía sau + aria-modal. Theo dõi media query
  // để xoay máy / đổi cỡ cửa sổ qua 1024px khi tấm đang mở vẫn đúng.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const apply = () => {
      body.style.overflow = mq.matches ? "hidden" : prevOverflow;
      if (mq.matches) ref.current?.setAttribute("aria-modal", "true");
      else ref.current?.removeAttribute("aria-modal");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      body.style.overflow = prevOverflow;
    };
  }, []);

  // Mobile: Tab / Shift+Tab quanh quẩn trong tấm (footer phía sau bị vùng mờ che)
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !window.matchMedia?.(MOBILE_QUERY).matches) return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!chunk) return null;
  const speechOk = isSpeechAvailable();
  const offscreen = closing || !entered;

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="drawer-backdrop"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-scrim transition-opacity duration-300 ease-out motion-reduce:transition-none lg:absolute lg:z-10 ${offscreen ? "opacity-0" : "opacity-100"}`}
      />
      {/* Mobile: tấm trượt từ dưới lên (85% màn hình). Desktop (lg): ngăn 500px bên phải, cố định giữa header (h-11) và footer (h-14) dính. */}
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label={chunk.headword}
        onKeyDown={trapTab}
        className={`fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none lg:bottom-14 lg:left-auto lg:right-0 lg:top-11 lg:z-20 lg:h-auto lg:w-[500px] lg:rounded-none lg:border-l lg:border-t-0 ${offscreen ? "translate-y-full lg:translate-x-full lg:translate-y-0" : "translate-x-0 translate-y-0"}`}
      >
        <div ref={scrollRef} data-testid="sheet-scroll" className="flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-5 lg:px-10 lg:pb-0 lg:pt-10">
          <div className="flex items-center justify-between text-[13px] text-muted max-lg:-mb-4 max-lg:pt-1">
            <span>{`// chunk ${index + 1}/${chunks.length}`}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="đóng"
              className="-mr-3 flex min-h-11 min-w-11 items-center justify-center hover:text-bright max-lg:focus-visible:outline-offset-[-8px] lg:mr-0 lg:block lg:min-h-0 lg:min-w-0"
            >
              <span className="text-[19px] leading-none text-text lg:hidden">✕</span>
              <span className="hidden lg:inline">
                đóng <Kbd>esc</Kbd>
              </span>
            </button>
          </div>

          <div>
            <h2 className="text-[22px] font-medium text-ink-strong">{chunk.headword}</h2>
            <p className="mt-2 text-[15px] text-bright">{chunk.meaning}</p>
          </div>

          {chunk.pattern && (
            <div className="border border-dashed border-accent p-5">
              <div className="text-xs tracking-widest text-accent">PATTERN</div>
              <div className="mt-2 text-[16px] text-bright">{chunk.pattern.formula}</div>
              <div className="mt-1 text-[13.5px] text-muted">{chunk.pattern.note}</div>
            </div>
          )}

          <div>
            <div className="mb-3 text-[13px] text-muted">{"// ví dụ"}</div>
            <ul className="space-y-4">
              {chunk.examples.map((ex) => (
                <li key={ex.en}>
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => speak(ex.en)}
                      disabled={!speechOk}
                      aria-label={`nghe: ${ex.en}`}
                      className="-mb-4 -mt-3 -mx-4 shrink-0 p-4 text-accent disabled:opacity-40 max-lg:focus-visible:outline-offset-[-12px] lg:m-0 lg:mt-1 lg:p-0"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
                      </svg>
                    </button>
                    <div>
                      <div className="text-[14.5px] text-bright">{ex.en}</div>
                      <div className="text-[13px] text-muted">{ex.vi}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {chunk.mistake && (
            <div className="border border-danger p-4">
              <div className="text-xs tracking-widest text-danger">LỖI HAY GẶP</div>
              <div className="mt-2 text-[14px] text-muted">
                sai: <span className="line-through">{chunk.mistake.wrong}</span> · đúng:{" "}
                <span className="text-bright">{chunk.mistake.right}</span>
              </div>
            </div>
          )}

          {chunk.note && <p className="text-[13.5px] leading-relaxed text-muted">{chunk.note}</p>}
        </div>

        {/* Mobile: dải mờ ở đáy vùng cuộn báo "còn nội dung bên dưới"; cuộn tới cuối thì ẩn */}
        <div
          aria-hidden="true"
          data-testid="sheet-fade"
          className={`pointer-events-none absolute inset-x-0 bottom-14 h-12 bg-gradient-to-b from-transparent to-surface transition-opacity duration-200 ease-out motion-reduce:transition-none lg:hidden ${more ? "opacity-100" : "opacity-0"}`}
        />

        {/* Hàng chuyển cụm ghim đáy, ngoài vùng cuộn — luôn thấy được trên mobile */}
        <div className="flex h-14 shrink-0 items-center justify-between border-t border-line px-2 text-[13px] text-muted lg:h-auto lg:border-0 lg:px-10 lg:pb-10 lg:pt-6">
          <button
            type="button"
            onClick={() => onNavigate(Math.max(0, index - 1))}
            disabled={index === 0}
            className="min-h-11 px-3 disabled:opacity-40 lg:min-h-0 lg:px-0"
          >
            ← chunk trước <Kbd>k</Kbd>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(Math.min(chunks.length - 1, index + 1))}
            disabled={index === chunks.length - 1}
            className="min-h-11 px-3 disabled:opacity-40 lg:min-h-0 lg:px-0"
          >
            <Kbd>j</Kbd> chunk sau →
          </button>
        </div>
      </div>
    </>
  );
}
