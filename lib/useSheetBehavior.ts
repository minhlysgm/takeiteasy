"use client";
import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { MOBILE_QUERY } from "@/lib/breakpoints";

export interface SheetOptions {
  /** Lúc mở: focus vào phần tử này (không cuộn trang) thay cho khung. Trả null → focus khung. */
  initialFocus?: () => HTMLElement | null;
  /**
   * Lúc đóng: focus vào phần tử trả về (không cuộn trang), hoặc null = để focus yên chỗ đang đứng.
   * Không truyền → trả focus về phần tử trước khi mở (có cuộn tới nó, vì nó có thể đã trôi khỏi màn hình).
   */
  restoreFocus?: () => HTMLElement | null;
}

/**
 * Hành vi chung của "tấm" nổi (drawer / bottom sheet):
 * - mount: focus vào phần tử; unmount: trả focus về chỗ cũ (lấy TRƯỚC khi chuyển focus) — đổi được bằng options.
 * - mobile (MOBILE_QUERY): khoá cuộn body + aria-modal, theo dõi đổi cỡ cửa sổ.
 * - onKeyDown: Tab / Shift+Tab quanh quẩn trong các nút của tấm (mobile).
 */
export function useSheetBehavior(ref: RefObject<HTMLElement | null>, options: SheetOptions = {}) {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const initial = opts.current.initialFocus?.();
    if (initial) initial.focus({ preventScroll: true });
    else ref.current?.focus();
    return () => {
      const { restoreFocus } = opts.current;
      if (restoreFocus) restoreFocus()?.focus({ preventScroll: true });
      else prev?.focus();
    };
  }, [ref]);

  // Mobile (< lg): tấm là modal — khoá cuộn trang phía sau + aria-modal. Theo dõi media query
  // để xoay máy / đổi cỡ cửa sổ qua 1024px khi tấm đang mở vẫn đúng.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const apply = () => {
      body.style.overflow = mq.matches ? "hidden" : prevOverflow;
      if (mq.matches) ref.current?.setAttribute("aria-modal", "true");
      else ref.current?.removeAttribute("aria-modal");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      body.style.overflow = prevOverflow;
    };
  }, [ref]);

  // Mobile: Tab / Shift+Tab quanh quẩn trong tấm (nội dung phía sau bị vùng mờ che)
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Tab" || !window.matchMedia?.(MOBILE_QUERY).matches) return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return { onKeyDown };
}
