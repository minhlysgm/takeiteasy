"use client";
import { useEffect, useRef, useState } from "react";
import type { Chunk } from "@/content/types";
import { isSpeechAvailable, speak } from "@/lib/speech";
import { Kbd } from "./Kbd";

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

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);

  // Mount ở vị trí ngoài màn hình rồi flip sang frame kế tiếp để CSS transition
  // chạy hiệu ứng trượt vào (kiểu drawer mobile).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Mobile: khoá cuộn trang phía sau trong lúc tấm mở (chỉ đọc media query trong effect)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, []);

  if (!chunk) return null;
  const speechOk = isSpeechAvailable();
  const offscreen = closing || !entered;

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="drawer-backdrop"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-scrim transition-opacity duration-300 motion-reduce:transition-none lg:absolute lg:z-10 ${offscreen ? "opacity-0" : "opacity-100"}`}
      />
      {/* Mobile: tấm trượt từ dưới lên (85% màn hình). Desktop (lg): ngăn 500px bên phải như cũ. */}
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label={chunk.headword}
        className={`fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none lg:absolute lg:inset-y-0 lg:left-auto lg:right-0 lg:z-20 lg:h-auto lg:w-[500px] lg:rounded-none lg:border-l lg:border-t-0 ${offscreen ? "translate-y-full lg:translate-x-full lg:translate-y-0" : "translate-x-0 translate-y-0"}`}
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line lg:hidden" />

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 lg:px-10 lg:pb-0 lg:pt-10">
          <div className="flex items-center justify-between text-[13px] text-muted">
            <span>{`// chunk ${index + 1}/${chunks.length}`}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="đóng"
              className="-mr-3 flex min-h-11 min-w-11 items-center justify-center hover:text-bright lg:mr-0 lg:block lg:min-h-0 lg:min-w-0"
            >
              <span className="lg:hidden">✕</span>
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
                      className="mt-1 shrink-0 text-accent disabled:opacity-40"
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
