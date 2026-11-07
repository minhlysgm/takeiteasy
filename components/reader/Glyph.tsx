import type { ReactNode } from "react";

/**
 * Ký tự trang trí ■ / ▶ trong nhãn nút: trình đọc màn hình bỏ qua, và luôn chiếm đúng 1 ô chữ mono
 * (ký tự rơi sang font dự phòng rộng hơn) để nút không đổi bề rộng khi "đọc to" ↔ "■ dừng".
 */
export function Glyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="inline-block w-[1ch]">
      {children}
    </span>
  );
}
