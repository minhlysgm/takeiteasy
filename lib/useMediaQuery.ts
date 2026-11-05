import { useCallback, useSyncExternalStore } from "react";

function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

const getServerSnapshot = () => false;

/** Theo dõi một media query. Server / môi trường không có `matchMedia` → false. */
export function useMediaQuery(query: string): boolean {
  // Giữ nguyên tham chiếu giữa các lần render để useSyncExternalStore không gỡ/đăng ký lại listener.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!hasMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => (hasMatchMedia() ? window.matchMedia(query).matches : false), [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
