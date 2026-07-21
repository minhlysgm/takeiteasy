"use client";
import type { TileModel } from "@/lib/matching";
export default function Tile({ tile, selected, shaking, disabled, onTap }:
  { tile: TileModel; selected: boolean; shaking: boolean; disabled: boolean; onTap: () => void }) {
  const bg = tile.side === "en" ? "bg-en" : "bg-vi";
  return (
    <button onClick={onTap} disabled={disabled}
      className={`relative ${bg} text-white border-2 border-ink rounded-tile px-2.5 pt-4 pb-2 min-h-[56px] text-sm font-display font-bold leading-tight
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink
        ${selected ? "scale-105 ring-2 ring-ink brightness-110" : ""}`}
      style={shaking ? { animation: "shake .42s" } : undefined}>
      <span className="absolute top-1 left-2 text-[9px] uppercase opacity-80 tracking-wide">
        {tile.side}
      </span>
      {tile.text}
    </button>
  );
}
