"use client";
import type { PointerEvent } from "react";
import { canLookUp, lookupUrl } from "@/lib/selection";
import { isSpeechAvailable, speak } from "@/lib/speech";

interface Props {
  text: string;
  /** Gọi ở pointerdown (chạm/bút) để vùng chọn không bị coi là đã bỏ khi chạm nút. */
  onKeep: () => void;
  size: "popup" | "dock";
}

const BASE = "flex items-center gap-2 text-bright disabled:opacity-40";
const SIZE_CLASS = {
  popup: "px-4 py-3",
  dock: "min-h-11 border border-line bg-bg px-3.5",
} as const;

/**
 * onPointerDown chỉ gọi `onKeep` khi chạm/bút. Chuột thì `onMouseDown` preventDefault đã giữ vùng chọn;
 * gọi keep() thêm chỉ làm cú click ra ngoài trong 800ms sau đó không tắt được thanh/popup.
 */
export function keepOnTouch(onKeep: () => void) {
  return (e: PointerEvent) => {
    if (e.pointerType !== "mouse") onKeep();
  };
}

export function SelectionActions({ text, onKeep, size }: Props) {
  const speechOk = isSpeechAvailable();
  const lookUp = canLookUp(text);
  const onPointerDown = keepOnTouch(onKeep);
  const cls = `${BASE} ${SIZE_CLASS[size]}`;
  // Popup: hai nút chung một khung, ngăn cách bằng đường kẻ giữa (chỉ khi có nút thứ hai).
  const nghe = size === "popup" && lookUp ? `${cls} border-r border-line` : cls;

  return (
    <>
      <button
        type="button"
        onClick={() => speak(text)}
        onPointerDown={onPointerDown}
        onMouseDown={(e) => e.preventDefault()}
        disabled={!speechOk}
        title={speechOk ? undefined : "trình duyệt không hỗ trợ đọc"}
        className={nghe}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.5v11l9-5.5z" fill="var(--accent)" />
        </svg>
        nghe
      </button>
      {lookUp && (
        <button
          type="button"
          onClick={() => window.open(lookupUrl(text), "_blank", "noopener")}
          onPointerDown={onPointerDown}
          onMouseDown={(e) => e.preventDefault()}
          className={cls}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="var(--ink)" strokeWidth="1.6" />
            <path d="M10.5 10.5 L14 14" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          tra nghĩa
        </button>
      )}
    </>
  );
}
