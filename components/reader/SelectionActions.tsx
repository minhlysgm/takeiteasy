"use client";
import { canLookUp } from "@/lib/selection";
import { speak } from "@/lib/speech";

interface Props {
  text: string;
  /** Trình duyệt đọc được không — PassageView đọc sau mount (khớp SSR), dùng chung với nút "đọc to". */
  speechOk: boolean;
  size: "popup" | "dock";
  /** Bấm "tra nghĩa": PassageView quyết định mở tấm giải thích (cụm soạn sẵn) hay gọi /api/lookup. */
  onLookUp: () => void;
  /** Thẻ kết quả đang mở dưới hàng nút. */
  lookupOpen: boolean;
}

const BASE = "flex items-center gap-2 text-bright disabled:opacity-40";
const SIZE_CLASS = {
  popup:
    "px-4 py-3 transition-colors hover:bg-bg disabled:hover:bg-transparent motion-reduce:transition-none",
  dock: "min-h-11 border bg-bg px-3.5 text-[13.5px]",
} as const;
/** Màu viền ô dock; "tra nghĩa" đang mở thẻ: gạch chân ink (popup) / viền ink (dock), như mockup. */
const IDLE_CLASS = { popup: "", dock: "border-line" } as const;
const OPEN_CLASS = {
  popup: "shadow-[inset_0_-2px_0_var(--ink)]",
  dock: "border-ink",
} as const;
const TOO_LONG_CLASS = {
  popup: "flex items-center px-4 py-3 text-[12.5px] text-muted",
  dock: "flex min-w-0 items-center px-1 text-[12.5px] text-muted",
} as const;

/**
 * Hai nút "nghe" / "tra nghĩa". Giữ vùng chọn khi bấm là việc của khung chứa (SelectionDock /
 * SelectionPopup): `data-selection-ui` cho chạm, `onMouseDown` preventDefault cho chuột.
 */
export function SelectionActions({ text, speechOk, size, onLookUp, lookupOpen }: Props) {
  const lookUp = canLookUp(text);
  const cls = `${BASE} ${SIZE_CLASS[size]}`;
  // Popup: hai ô chung một khung, ngăn cách bằng đường kẻ giữa.
  const nghe = size === "popup" ? `${cls} border-r border-line` : `${cls} ${IDLE_CLASS.dock}`;

  return (
    <>
      <button
        type="button"
        onClick={() => speak(text)}
        disabled={!speechOk}
        title={speechOk ? undefined : "trình duyệt không hỗ trợ đọc"}
        className={nghe}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.5v11l9-5.5z" fill="var(--accent)" />
        </svg>
        nghe
      </button>
      {lookUp ? (
        <button
          type="button"
          onClick={onLookUp}
          aria-expanded={lookupOpen}
          className={`${cls} ${lookupOpen ? OPEN_CLASS[size] : IDLE_CLASS[size]}`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="var(--ink)" strokeWidth="1.6" />
            <path d="M10.5 10.5 L14 14" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          tra nghĩa
        </button>
      ) : (
        <span className={TOO_LONG_CLASS[size]}>dài quá để tra · xem bản dịch bên cạnh</span>
      )}
    </>
  );
}
