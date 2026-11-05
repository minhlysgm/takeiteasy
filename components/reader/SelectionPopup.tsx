"use client";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { placePopup } from "@/lib/selection";
import type { TextSelection } from "@/lib/useTextSelection";
import { LookupCard, type LookupState } from "./LookupCard";
import { SelectionActions } from "./SelectionActions";

interface Props {
  selection: TextSelection;
  containerRef: RefObject<HTMLElement | null>;
  speechOk: boolean;
  /** Thẻ tra nghĩa của vùng chọn này (null = chưa mở). */
  lookup: LookupState | null;
  onLookUp: () => void;
  /** Popup không có ✕ (đóng bằng Esc / bấm ra ngoài); giữ cùng giao diện với SelectionDock. */
  onCloseLookup: () => void;
}

/** Header desktop dính cao 44px + 8px đệm. */
const MIN_TOP = 52;

/** Popup nổi trên desktop; tự đo mình rồi canh vào trong màn hình. */
export function SelectionPopup({ selection, containerRef, speechOk, lookup, onLookUp }: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const { text, rect } = selection;

  useLayoutEffect(() => {
    const popup = popupRef.current;
    // Lần mount đầu cùng lúc với container: effect của con chạy trước khi ref của cha được gắn.
    const container = containerRef.current ?? popup?.parentElement;
    if (!popup || !container) return;
    const p = popup.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    const { left, top } = placePopup({
      sel: rect,
      container: c,
      popup: { width: p.width, height: p.height },
      viewportWidth: window.innerWidth,
      minTop: MIN_TOP,
    });
    setPos({ left, top });
    // Thẻ mở ra / đổi từ khung xương sang kết quả → popup đổi cỡ, đo lại.
  }, [rect, text, containerRef, lookup?.phase]);

  return (
    <div
      ref={popupRef}
      data-testid="selection-popup"
      data-selection-ui=""
      role="toolbar"
      aria-label="chữ đang chọn"
      className={`absolute z-10 border border-line bg-surface text-[13.5px] shadow-xl ${lookup ? "grid w-[360px] max-w-[calc(100vw-16px)]" : "flex"} ${pos ? "" : "invisible"}`}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex">
        <SelectionActions text={text} speechOk={speechOk} size="popup" onLookUp={onLookUp} lookupOpen={lookup !== null} />
      </div>
      {lookup && <LookupCard state={lookup} text={text} speechOk={speechOk} />}
    </div>
  );
}
