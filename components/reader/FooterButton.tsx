import type { ComponentPropsWithRef } from "react";

interface Props extends ComponentPropsWithRef<"button"> {
  /** Đang bật (vd. "giải thích"): viền + chữ màu ink, không đổi màu khi rê chuột. */
  active?: boolean;
  /** Chỉ hiện ở desktop (lg) — vd. "theme", "đoạn tiếp" có phím tắt riêng. */
  desktopOnly?: boolean;
}

/** Nút có viền ở footer màn đọc: cao 38px trên mobile, gọn lại trên desktop. */
export function FooterButton({ active = false, desktopOnly = false, className = "", type = "button", ...rest }: Props) {
  const display = desktopOnly ? "hidden lg:flex" : "flex";
  const tone = active
    ? "border-ink text-ink"
    : "border-line hover:border-accent hover:text-bright disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted";
  return (
    <button
      type={type}
      className={`${display} h-[38px] items-center justify-center gap-2 whitespace-nowrap border px-2 transition-colors motion-reduce:transition-none lg:h-auto lg:px-3 lg:py-1.5 ${tone} ${className}`}
      {...rest}
    />
  );
}
