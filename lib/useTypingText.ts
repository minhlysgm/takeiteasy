"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  charMs?: number;
  enabled?: boolean;
}

export function useTypingText(text: string, { charMs = 25, enabled = true }: Options = {}) {
  const [count, setCount] = useState(() => (enabled ? 0 : text.length));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = text.length;

  useEffect(() => {
    if (!enabled) {
      setCount(text.length);
      return;
    }
    setCount(0);
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
  }, [text, charMs, enabled]);

  const skip = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCount(total);
  }, [total]);

  return { display: text.slice(0, count), done: count >= total, skip };
}
