"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  charMs?: number;
  enabled?: boolean;
  /** false = chờ: chưa gõ chữ nào, chưa hẹn giờ. Chuyển sang true thì bắt đầu gõ từ đầu. `enabled: false` vẫn thắng. */
  start?: boolean;
}

export function useTypingText(text: string, { charMs = 25, enabled = true, start = true }: Options = {}) {
  const [count, setCount] = useState(() => (enabled ? 0 : text.length));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = text.length;

  // Đổi text (sang đoạn mới mà không remount): đặt lại ngay trong lúc vẽ, để không lần vẽ nào
  // mang text mới với số chữ đã gõ của text cũ (effect bên dưới chạy sau khi đã vẽ, trễ một khung).
  const [shownText, setShownText] = useState(text);
  let typed = count;
  if (shownText !== text) {
    typed = enabled ? 0 : text.length;
    setShownText(text);
    setCount(typed);
  }

  useEffect(() => {
    if (!enabled) {
      setCount(text.length);
      return;
    }
    setCount(0);
    if (!start) return;
    let i = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) {
        const jitter = charMs * (0.6 + Math.random() * 0.8); // nhịp gõ tự nhiên
        timer.current = setTimeout(tick, jitter);
      }
    };
    timer.current = setTimeout(tick, charMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, charMs, enabled, start]);

  const skip = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCount(total);
  }, [total]);

  return { display: text.slice(0, typed), done: typed >= total, skip };
}
