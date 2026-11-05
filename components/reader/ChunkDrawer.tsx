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

  if (!chunk) return null;
  const speechOk = isSpeechAvailable();
  const offscreen = closing || !entered;

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="drawer-backdrop"
        onClick={onClose}
        className={`absolute inset-0 z-10 bg-scrim transition-opacity duration-300 motion-reduce:transition-none ${offscreen ? "opacity-0" : "opacity-100"}`}
      />
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={chunk.headword}
      className={`absolute inset-y-0 right-0 z-20 flex w-[500px] flex-col gap-6 overflow-y-auto border-l border-line bg-surface p-10 shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none ${offscreen ? "translate-x-full" : "translate-x-0"}`}
    >
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{`// chunk ${index + 1}/${chunks.length}`}</span>
        <button type="button" onClick={onClose} className="hover:text-bright">
          đóng <Kbd>esc</Kbd>
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

      <div className="mt-auto flex items-center justify-between text-[13px] text-muted">
        <button
          type="button"
          onClick={() => onNavigate(Math.max(0, index - 1))}
          disabled={index === 0}
          className="disabled:opacity-40"
        >
          ← chunk trước <Kbd>k</Kbd>
        </button>
        <button
          type="button"
          onClick={() => onNavigate(Math.min(chunks.length - 1, index + 1))}
          disabled={index === chunks.length - 1}
          className="disabled:opacity-40"
        >
          <Kbd>j</Kbd> chunk sau →
        </button>
      </div>
    </div>
    </>
  );
}
