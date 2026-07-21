import type { Chunk } from "@/content/types";

export type TileModel = { key: string; chunkId: number; side: "en" | "vi"; text: string };
export type TapResult = { kind: "select" | "deselect" | "reselect" | "match" | "miss" };

export function buildTiles(chunks: Chunk[], rand: () => number = Math.random): TileModel[] {
  const tiles: TileModel[] = [];
  chunks.forEach((c, i) => {
    tiles.push({ key: `en-${i}`, chunkId: i, side: "en", text: c.en });
    tiles.push({ key: `vi-${i}`, chunkId: i, side: "vi", text: c.vi });
  });
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export function resolveTap(selected: TileModel | null, tapped: TileModel): TapResult {
  if (!selected) return { kind: "select" };
  if (selected.key === tapped.key) return { kind: "deselect" };
  if (selected.side === tapped.side) return { kind: "reselect" };
  return selected.chunkId === tapped.chunkId ? { kind: "match" } : { kind: "miss" };
}
