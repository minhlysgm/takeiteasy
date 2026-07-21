"use client";
import type { Chunk } from "@/content/types";
export default function Composer({ chunks, filled, label, glowIndex }:
  { chunks: Chunk[]; filled: boolean[]; label: string; glowIndex?: number }) {
  return (
    <div className="border-2 border-ink rounded-card bg-surface p-3">
      <p className="text-2xs font-display text-ink-soft mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {chunks.map((c, i) => {
          const on = filled[i];
          return (
            <span key={i}
              className={`rounded-tile px-2.5 py-1.5 text-sm font-display font-bold border-2 leading-tight
                ${on ? "bg-vi text-white border-ink animate-spring" : "bg-sunken border-dashed border-ink text-transparent"}
                ${glowIndex === i ? "brightness-125 ring-2 ring-ink" : ""}`}>
              {c.en}
            </span>
          );
        })}
      </div>
    </div>
  );
}
