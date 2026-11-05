"use client";
import { useEffect, useId, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import type { TextSelection } from "@/lib/useTextSelection";
import { LookupCard, type LookupState } from "./LookupCard";
import { SelectionActions } from "./SelectionActions";

interface Props {
  selection: TextSelection;
  speechOk: boolean;
  /** Thẻ tra nghĩa của vùng chọn này (null = chưa mở). */
  lookup: LookupState | null;
  onLookUp: () => void;
  onCloseLookup: () => void;
}

/** Khoảng hở giữa chữ đang chọn và mép trên thanh / mép trên màn hình. */
const GAP = 12;

/** Thanh chọn chữ trên mobile: khối trong luồng, nằm ngay trên footer. */
export function SelectionDock({ selection, speechOk, lookup, onLookUp, onCloseLookup }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cardId = useId();

  // Thanh hiện ra đè lên chữ đang chọn (và tay cầm) → cuộn trang lên vừa đủ, không đẩy đỉnh vùng chọn
  // ra khỏi màn hình.
  useEffect(() => {
    const dock = ref.current;
    if (!dock) return;
    const { top, height } = selection.rect;
    const delta = Math.min(top + height - (dock.getBoundingClientRect().top - GAP), top - GAP);
    if (delta > 0) window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selection, lookup?.phase]);

  return (
    <div
      ref={ref}
      data-testid="selection-dock"
      data-selection-ui=""
      className="grid shrink-0 gap-1 border-t border-line bg-surface px-2 py-2"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Chữ dài: chỉ phần chữ bị cắt "…", hai dấu ngoặc luôn còn */}
      <div className="flex min-w-0 px-2 text-[12.5px] text-muted">
        <span className="shrink-0">&quot;</span>
        <b className="min-w-0 truncate font-normal text-bright">{selection.text}</b>
        <span className="shrink-0">&quot;</span>
      </div>
      {/* toolbar chỉ bọc các nút; chữ trích và thẻ nằm ngoài */}
      <div role="toolbar" aria-label="chữ đang chọn" className="flex items-center gap-2">
        <SelectionActions
          text={selection.text}
          speechOk={speechOk}
          size="dock"
          onLookUp={onLookUp}
          lookupOpen={lookup !== null}
          cardId={cardId}
          onClose={onCloseLookup}
        />
      </div>
      {/* Thẻ mở lên phía trên footer, cao tối đa nửa màn hình; thân thẻ cuộn bên trong, dòng chân luôn hiện */}
      {lookup && (
        <div className="-mx-2 -mb-2 flex max-h-[50dvh] min-h-0 min-w-0 flex-col border-t border-line">
          <LookupCard id={cardId} state={lookup} text={selection.text} speechOk={speechOk} />
        </div>
      )}
    </div>
  );
}
