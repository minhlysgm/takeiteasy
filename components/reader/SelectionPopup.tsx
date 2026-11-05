"use client";
import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { placePopup, type Box } from "@/lib/selection";
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
  /** ✕ "đóng thẻ" ở cuối hàng nút (ngoài ra Esc / bấm ra ngoài cũng đóng). */
  onCloseLookup: () => void;
}

/** Header desktop dính cao 44px + 8px đệm. */
const MIN_TOP = 52;
/** Footer desktop dính cao 56px + 8px đệm. */
const FOOTER_GAP = 64;
/** Chỗ nên có cho thẻ tra nghĩa (thẻ "lout" cao ~300px) — đủ thì popup nằm phía trên vùng chọn. */
const CARD_ROOM = 320;
const MARGIN = 8;

/**
 * Popup nổi trên desktop; tự đo mình rồi canh vào trong màn hình. Phía (trên / dưới vùng chọn) và mép sát
 * vùng chọn được chọn một lần cho mỗi vùng chọn: thẻ mở ra / đổi trạng thái thì popup lớn lên về phía xa
 * vùng chọn, hàng nút "nghe · tra nghĩa" đứng yên dưới con trỏ.
 */
export function SelectionPopup({ selection, containerRef, speechOk, lookup, onLookUp, onCloseLookup }: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const cardId = useId();
  const placed = useRef<{ rect: Box; left: number; anchor: number; below: boolean } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean; maxHeight: number } | null>(null);
  const { text, rect } = selection;
  const open = lookup !== null;

  useLayoutEffect(() => {
    const popup = popupRef.current;
    // Lần mount đầu cùng lúc với container: effect của con chạy trước khi ref của cha được gắn.
    const container = containerRef.current ?? popup?.parentElement;
    if (!popup || !container) return;
    const p = popup.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    const vw = window.innerWidth;
    const maxBottom = window.innerHeight - FOOTER_GAP;
    if (placed.current?.rect !== rect) {
      const r = placePopup({
        sel: rect,
        container: c,
        popup: { width: p.width, height: p.height },
        viewportWidth: vw,
        minTop: MIN_TOP,
        maxBottom,
        wantRoom: CARD_ROOM,
      });
      placed.current = { rect, left: r.left, anchor: r.anchor, below: r.below };
    }
    const { left, anchor, below } = placed.current;
    // Thẻ mở → popup rộng ra: giữ mép trái, chỉ dịch sang trái khi tràn mép phải màn hình.
    const l = Math.max(MARGIN - c.left, Math.min(left, vw - MARGIN - p.width - c.left));
    // Cao tối đa = chỗ còn lại giữa mép neo và header / footer dính (đo lại theo chỗ cuộn hiện tại).
    const edge = c.top + anchor;
    const maxHeight = Math.max(0, below ? maxBottom - edge : edge - MIN_TOP);
    const h = Math.min(p.height, maxHeight);
    setPos({ left: l, top: below ? anchor : anchor - h, below, maxHeight });
    // Thẻ mở ra / đổi từ khung xương sang kết quả → popup đổi cỡ, đo lại.
  }, [rect, text, containerRef, open, lookup?.phase]);

  const below = pos?.below ?? true;
  return (
    <div
      ref={popupRef}
      data-testid="selection-popup"
      data-selection-ui=""
      // Ở trên vùng chọn: hàng nút nằm đáy popup (sát vùng chọn), thẻ mọc lên trên
      className={`absolute z-10 flex border border-line bg-surface text-[13.5px] shadow-xl ${below ? "flex-col" : "flex-col-reverse"} ${open ? "w-[360px] max-w-[calc(100vw-16px)]" : ""} ${pos ? "" : "invisible"}`}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, maxHeight: pos?.maxHeight }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* toolbar chỉ bọc các nút; thẻ (chữ + link) nằm ngoài */}
      <div
        role="toolbar"
        aria-label="chữ đang chọn"
        className={`flex shrink-0 ${open ? (below ? "border-b border-line" : "border-t border-line") : ""}`}
      >
        <SelectionActions
          text={text}
          speechOk={speechOk}
          size="popup"
          onLookUp={onLookUp}
          lookupOpen={open}
          cardId={cardId}
          onClose={onCloseLookup}
        />
      </div>
      {lookup && <LookupCard id={cardId} state={lookup} text={text} speechOk={speechOk} />}
    </div>
  );
}
