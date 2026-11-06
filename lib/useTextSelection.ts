import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { normalizeSelectionText, type Box } from "@/lib/selection";

export interface TextSelection {
  text: string;
  /** Offset ký tự của vùng chọn trong `container.textContent` (= offset trong `passage.caption`). */
  start: number;
  end: number;
  /** Toạ độ viewport của `getRangeAt(0).getBoundingClientRect()`. */
  rect: Box;
}

const DEFAULT_SETTLE_MS = 250;
/** Thanh/popup chọn chữ đánh dấu bằng thuộc tính này để chạm vào nó không bị coi là bỏ chọn. */
const SELECTION_UI = "[data-selection-ui]";
/** Sau khi chạm thanh/popup, vùng chọn bị bỏ không làm mất `selection` trong khoảng này. */
const KEEP_MS = 800;

function sameSelection(a: TextSelection | null, b: TextSelection | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.text === b.text &&
    a.start === b.start &&
    a.end === b.end &&
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
 * - Chạm/bút vào thanh/popup (phần tử có `data-selection-ui`): trình duyệt hay bỏ chọn lúc chạm, nên
 *   800ms kế tiếp vùng chọn xẹp không làm mất `selection` (kịp cho click tới nút).
 *   Chuột không cần: `onMouseDown` preventDefault của thanh đã giữ vùng chọn.
 */
export function useTextSelection(
  containerRef: RefObject<HTMLElement | null>,
  opts?: { settleMs?: number; resetKey?: string },
): { selection: TextSelection | null; clear: () => void } {
  const settleMs = opts?.settleMs ?? DEFAULT_SETTLE_MS;
  const [selection, setSelection] = useState<TextSelection | null>(null);
  // `resetKey` đổi (sang đoạn mới) → bỏ selection ngay trong lúc vẽ; vùng chọn của trình duyệt thì
  // người gọi bỏ bằng `clear()` trong effect.
  const [shownKey, setShownKey] = useState(opts?.resetKey);
  let current = selection;
  if (shownKey !== opts?.resetKey) {
    current = null;
    setShownKey(opts?.resetKey);
    setSelection(null);
  }
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
      const range = sel.getRangeAt(0);
      const pre = document.createRange();
      pre.selectNodeContents(container);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      const end = start + range.toString().length;
      const r = range.getBoundingClientRect();
      publish({ text, start, end, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
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
      if (ev.target instanceof Element && ev.target.closest(SELECTION_UI)) {
        keepUntil.current = Date.now() + KEEP_MS;
        return;
      }
      // Chạm ngoài khi vùng chọn đã xẹp (và hết hạn giữ) → thanh biến mất.
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

    // pointercancel, hoặc rời cửa sổ giữa lúc kéo (alt-tab): pointerup có thể không bao giờ tới.
    const onPointerCancel = () => {
      mouseDown.current = false;
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("blur", onPointerCancel);
    return () => {
      window.removeEventListener("blur", onPointerCancel);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      cancelTimer();
    };
  }, [containerRef, settleMs, cancelTimer, publish]);

  return { selection: current, clear };
}
