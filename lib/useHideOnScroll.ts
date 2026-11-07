import { useCallback, useEffect, useRef, useState } from "react";

/** Gần đầu trang hơn mức này thì luôn hiện (≈ chiều cao header). */
const TOP_ZONE = 44;
/** Cuộn ít hơn mức này (px) so với mốc thì bỏ qua — tránh nháy khi tay rung / quán tính. */
const SLOP = 8;

export interface HideState {
  hidden: boolean;
  /** scrollY lần cuối đổi trạng thái hoặc vượt ngưỡng. */
  anchor: number;
}

/** Một bước: từ trạng thái cũ + scrollY mới → trạng thái mới (thuần, để test). */
export function stepHideOnScroll(prev: HideState, y: number): HideState {
  if (y <= TOP_ZONE) return { hidden: false, anchor: y };
  const d = y - prev.anchor;
  if (d > SLOP) return { hidden: true, anchor: y };
  if (d < -SLOP) return { hidden: false, anchor: y };
  return prev;
}

/**
 * Ẩn khi cuộn xuống, hiện khi cuộn lên (kiểu thanh địa chỉ trình duyệt mobile). Trả `[hidden, reveal]`;
 * `reveal` gắn vào onFocus của header: focus (Tab) vào header đang ẩn thì hiện ngay, và giữ nguyên chỗ đang đọc
 * (trình duyệt tự cuộn tới phần tử vừa focus). Người gọi tự quyết áp dụng ở breakpoint nào.
 */
export function useHideOnScroll(): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  const state = useRef<HideState>({ hidden: false, anchor: 0 });
  /** Tới lúc này (performance.now) thì không ẩn — đang trả trang về chỗ cũ sau khi focus. */
  const holdUntil = useRef(0);
  /** scrollY ở sự kiện scroll gần nhất — Chrome cuộn tới phần tử TRƯỚC khi bắn focus, nên phải nhớ chỗ cũ từ đây. */
  const lastY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      lastY.current = window.scrollY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        state.current = performance.now() < holdUntil.current ? { hidden: false, anchor: y } : stepHideOnScroll(state.current, y);
        setHidden(state.current.hidden);
      });
    };
    lastY.current = window.scrollY;
    state.current = { hidden: false, anchor: window.scrollY };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const reveal = useCallback(() => {
    if (!state.current.hidden) return;
    const y = lastY.current;
    holdUntil.current = performance.now() + 300;
    state.current = { hidden: false, anchor: y };
    setHidden(false);
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    });
  }, []);

  return [hidden, reveal];
}
