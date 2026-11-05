"use client";
import { canLookUp, lookupUrl } from "@/lib/selection";
import { isSpeechAvailable, speak } from "@/lib/speech";

interface Props {
  text: string;
  /** Gọi ở pointerdown để vùng chọn không bị coi là đã bỏ khi chạm nút. */
  onKeep: () => void;
  size: "popup" | "dock";
}

const BASE = "flex items-center gap-2 text-bright disabled:opacity-40";
const SIZE_CLASS = {
  popup: "px-4 py-3",
  dock: "min-h-11 border border-line bg-bg px-3.5",
} as const;

export function SelectionActions({ text, onKeep, size }: Props) {
  const speechOk = isSpeechAvailable();
  const cls = `${BASE} ${SIZE_CLASS[size]}`;
  // Popup: hai nút chung một khung, ngăn cách bằng đường kẻ giữa.
  const nghe = size === "popup" ? `${cls} border-r border-line` : cls;

  return (
    <>
      <button
        type="button"
        onClick={() => speak(text)}
        onPointerDown={onKeep}
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
      {canLookUp(text) && (
        <button
          type="button"
          onClick={() => window.open(lookupUrl(text), "_blank", "noopener")}
          onPointerDown={onKeep}
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
