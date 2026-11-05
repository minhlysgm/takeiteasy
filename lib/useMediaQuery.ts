import { useSyncExternalStore } from "react";

function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/** Theo dõi một media query. Server / môi trường không có `matchMedia` → false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!hasMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (hasMatchMedia() ? window.matchMedia(query).matches : false),
    () => false,
  );
}
