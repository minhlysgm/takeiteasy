"use client";
import type { TextSelection } from "@/lib/useTextSelection";
import { SelectionActions, keepOnTouch } from "./SelectionActions";

interface Props {
  selection: TextSelection;
  onKeep: () => void;
}

/** Thanh chọn chữ trên mobile: khối trong luồng, nằm ngay trên footer. */
export function SelectionDock({ selection, onKeep }: Props) {
  return (
    <div
      data-testid="selection-dock"
      role="toolbar"
      aria-label="chữ đang chọn"
      className="grid shrink-0 gap-1 border-t border-line bg-surface px-2 pb-1.5 pt-2"
      onPointerDown={keepOnTouch(onKeep)}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="truncate px-2 text-[12.5px] text-muted">
        &quot;<b className="font-normal text-bright">{selection.text}</b>&quot;
      </div>
      <div className="flex gap-2">
        <SelectionActions text={selection.text} onKeep={onKeep} size="dock" />
      </div>
    </div>
  );
}
