import type { ReactNode } from "react";

/** Gợi ý phím tắt. Ẩn trên thiết bị cảm ứng (không có bàn phím để bấm). */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line px-1.5 py-0.5 text-xs [@media(pointer:coarse)]:hidden">{children}</kbd>
  );
}
