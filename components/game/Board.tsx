"use client";
import Tile from "./Tile";
import type { TileModel } from "@/lib/matching";
export default function Board({ tiles, selectedKey, shakingKeys, locked, onTap }:
  { tiles: TileModel[]; selectedKey: string | null; shakingKeys: string[]; locked: boolean; onTap: (t: TileModel) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map(t => (
        <Tile key={t.key} tile={t} selected={selectedKey === t.key}
          shaking={shakingKeys.includes(t.key)} disabled={locked} onTap={() => onTap(t)} />
      ))}
    </div>
  );
}
