"use client";
import { useEffect, useState } from "react";
import { isSpeechAvailable, speak } from "@/lib/speech";

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Tip {
  text: string;
  x: number;
  y: number;
}

export function SpeechTooltip({ containerRef }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const onMouseUp = () => {
      const container = containerRef.current;
      const sel = window.getSelection();
      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setTip(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text || !container.contains(sel.anchorNode)) {
        setTip(null);
        return;
      }
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        setTip({
          text,
          x: rect.left - cRect.left + rect.width / 2,
          y: rect.top - cRect.top,
        });
      } catch {
        setTip(null);
      }
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [containerRef]);

  if (!tip) return null;

  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-full border border-line bg-surface text-[13.5px] shadow-xl"
      style={{ left: tip.x, top: tip.y - 10 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => speak(tip.text)}
        disabled={!isSpeechAvailable()}
        className="flex items-center gap-2 border-r border-line px-4 py-3 text-bright disabled:opacity-40"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.5v11l9-5.5z" fill="var(--accent)" />
        </svg>
        nghe
      </button>
      <button
        type="button"
        onClick={() =>
          window.open(
            `https://dictionary.cambridge.org/search/english/?q=${encodeURIComponent(tip.text)}`,
            "_blank",
            "noopener",
          )
        }
        className="flex items-center gap-2 px-4 py-3 text-bright"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" stroke="var(--ink)" strokeWidth="1.6" />
          <path d="M10.5 10.5 L14 14" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        tra nghĩa
      </button>
    </div>
  );
}
