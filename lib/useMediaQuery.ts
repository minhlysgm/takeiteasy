import { useMemo, useSyncExternalStore } from "react";

function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

const getServerSnapshot = () => false;

/** Theo dõi một media query. Server / môi trường không có `matchMedia` → false. */
export function useMediaQuery(query: string): boolean {
  // Một MediaQueryList cho mỗi query, dùng chung cho subscribe và getSnapshot; tham chiếu ổn định
  // giữa các lần render để useSyncExternalStore không gỡ/đăng ký lại listener.
  const { subscribe, getSnapshot } = useMemo(() => {
    const mql = hasMatchMedia() ? window.matchMedia(query) : null;
    return {
      subscribe: (onChange: () => void) => {
        if (!mql) return () => {};
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      },
      getSnapshot: () => mql?.matches ?? false,
    };
  }, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
