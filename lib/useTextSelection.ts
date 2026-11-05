import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { normalizeSelectionText, type Box } from "@/lib/selection";

export interface TextSelection {
  text: string;
  /** Toạ độ viewport của `getRangeAt(0).getBoundingClientRect()`. */
  rect: Box;
}

const DEFAULT_SETTLE_MS = 250;
/** Sau `keep()`, vùng chọn bị bỏ không làm mất `selection` trong khoảng này. */
const KEEP_MS = 800;

function sameSelection(a: TextSelection | null, b: TextSelection | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.text === b.text &&
    a.rect.left === b.rect.left &&
    a.rect.top === b.rect.top &&
    a.rect.width === b.rect.width &&
    a.rect.height === b.rect.height
  );
}

/**
 * Theo dõi vùng chọn chữ trong `containerRef` (chuột lẫn cảm ứng).
 * - Đợi `selectionchange` lặng `settleMs` rồi mới đọc (chạm: tay còn kéo handle thì chưa công bố).
 * - Chuột đang giữ thì chưa công bố; nhả chuột thì đọc ngay.
 * - `keep()`: gọi ở `onPointerDown` của nút trên thanh — trình duyệt hay bỏ chọn lúc chạm,
 *   nên 800ms kế tiếp vùng chọn xẹp không làm mất `selection`.
 */
export function useTextSelection(
  containerRef: RefObject<HTMLElement | null>,
  opts?: { settleMs?: number },
): { selection: TextSelection | null; keep: () => void; clear: () => void } {
  const settleMs = opts?.settleMs ?? DEFAULT_SETTLE_MS;
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const keepUntil = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDown = useRef(false);
  const hasSelection = useRef(false);

  const publish = useCallback((next: TextSelection | null) => {
    hasSelection.current = next !== null;
    setSelection((prev) => (sameSelection(prev, next) ? prev : next));
  }, []);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const keep = useCallback(() => {
    keepUntil.current = Date.now() + KEEP_MS;
  }, []);

  const clear = useCallback(() => {
    cancelTimer();
    publish(null);
    window.getSelection()?.removeAllRanges();
  }, [cancelTimer, publish]);

  useEffect(() => {
    const isKeeping = () => Date.now() <= keepUntil.current;
    const isCollapsed = () => {
      const sel = window.getSelection();
      return !sel || sel.isCollapsed || sel.rangeCount === 0;
    };

    const read = () => {
      timer.current = null;
      const container = containerRef.current;
      const sel = window.getSelection();
      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        // Vùng chọn bị bỏ: nếu vừa chạm nút trên thanh thì giữ lại để click kịp tới nút.
        if (!isKeeping()) publish(null);
        return;
      }
      const text = normalizeSelectionText(sel.toString());
      if (!text || !container.contains(sel.anchorNode) || !container.contains(sel.focusNode)) {
        publish(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      publish({ text, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
    };

    const onSelectionChange = () => {
      cancelTimer();
      if (mouseDown.current) return;
      timer.current = setTimeout(read, settleMs);
    };

    const onPointerDown = (e: Event) => {
      const ev = e as PointerEvent;
      if (ev.pointerType === "mouse" && ev.button === 0) {
        mouseDown.current = true;
        cancelTimer();
        return;
      }
      // Chạm ngoài khi vùng chọn đã xẹp (và hết hạn keep) → thanh biến mất.
      // Nút trên thanh gọi keep() ở onPointerDown của React — chạy ở root, trước listener này (bubble).
      if (hasSelection.current && !isKeeping() && isCollapsed()) {
        cancelTimer();
        publish(null);
      }
    };

    const onPointerUp = (e: Event) => {
      if ((e as PointerEvent).pointerType !== "mouse" || !mouseDown.current) return;
      mouseDown.current = false;
      cancelTimer();
      read();
    };

    const onPointerCancel = () => {
      mouseDown.current = false;
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      cancelTimer();
    };
  }, [containerRef, settleMs, cancelTimer, publish]);

  return { selection, keep, clear };
}
