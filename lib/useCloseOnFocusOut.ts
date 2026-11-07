import { useEffect, useRef, type RefObject } from "react";

/**
 * Ô nổi desktop không khoá focus: focus rơi vào chỗ khác ngoài `ref` (Tab ra, kể cả vòng qua đầu trang) thì gọi
 * `onFocusOut` để đóng, focus để yên ở chỗ vừa tới. Bấm chuột ra ngoài không đổi focus → backdrop lo việc đó.
 * Kiểm lại SAU khi focus ổn định: StrictMode (dev) chạy cleanup của useSheetBehavior (trả focus) rồi focus lại khung.
 */
export function useCloseOnFocusOut(ref: RefObject<HTMLElement | null>, onFocusOut: () => void): void {
  const cb = useRef(onFocusOut);
  useEffect(() => {
    cb.current = onFocusOut;
  });
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof Node) || ref.current?.contains(e.target)) return;
      queueMicrotask(() => {
        const at = document.activeElement;
        if (ref.current?.isConnected && at && at !== document.body && !ref.current.contains(at)) cb.current();
      });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [ref]);
}
