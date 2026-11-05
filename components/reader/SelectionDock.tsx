"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import type { TextSelection } from "@/lib/useTextSelection";
import { SelectionActions } from "./SelectionActions";

interface Props {
  selection: TextSelection;
  speechOk: boolean;
}

/** Khoảng hở giữa chữ đang chọn và mép trên thanh / mép trên màn hình. */
const GAP = 12;

/** Thanh chọn chữ trên mobile: khối trong luồng, nằm ngay trên footer. */
export function SelectionDock({ selection, speechOk }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Thanh hiện ra đè lên chữ đang chọn (và tay cầm) → cuộn trang lên vừa đủ, không đẩy đỉnh vùng chọn
  // ra khỏi màn hình.
  useEffect(() => {
    const dock = ref.current;
    if (!dock) return;
    const { top, height } = selection.rect;
    const delta = Math.min(top + height - (dock.getBoundingClientRect().top - GAP), top - GAP);
    if (delta > 0) window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selection]);

  return (
    <div
      ref={ref}
      data-testid="selection-dock"
      data-selection-ui=""
      role="toolbar"
      aria-label="chữ đang chọn"
      className="grid shrink-0 gap-1 border-t border-line bg-surface px-2 py-2"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Chữ dài: chỉ phần chữ bị cắt "…", hai dấu ngoặc luôn còn */}
      <div className="flex min-w-0 px-2 text-[12.5px] text-muted">
        <span className="shrink-0">&quot;</span>
        <b className="min-w-0 truncate font-normal text-bright">{selection.text}</b>
        <span className="shrink-0">&quot;</span>
      </div>
      <div className="flex gap-2">
        <SelectionActions text={selection.text} speechOk={speechOk} size="dock" />
      </div>
    </div>
  );
}
