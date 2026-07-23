import { describe, it, expect } from "vitest";
import { buildTiles, resolveTap, tileVisual, TileModel } from "../lib/matching";

const chunks = [
  { en: "Before 12", vi: "trước 12h" },
  { en: "I'll ping you", vi: "em báo anh liền" },
];

describe("buildTiles", () => {
  it("makes 2 tiles per chunk with chunkId + side", () => {
    const t = buildTiles(chunks, () => 0);
    expect(t).toHaveLength(4);
    expect(t.filter(x => x.side === "en")).toHaveLength(2);
    expect(t.filter(x => x.chunkId === 0)).toHaveLength(2);
  });
});

describe("resolveTap", () => {
  const en0: TileModel = { key: "a", chunkId: 0, side: "en", text: "Before 12" };
  const vi0: TileModel = { key: "b", chunkId: 0, side: "vi", text: "trước 12h" };
  const vi1: TileModel = { key: "c", chunkId: 1, side: "vi", text: "em báo anh liền" };
  const en1: TileModel = { key: "d", chunkId: 1, side: "en", text: "I'll ping you" };

  it("first tap selects", () => expect(resolveTap(null, en0).kind).toBe("select"));
  it("tapping same tile deselects", () => expect(resolveTap(en0, en0).kind).toBe("deselect"));
  it("tapping same-side other tile reselects", () => expect(resolveTap(en0, en1).kind).toBe("reselect"));
  it("cross-side same id matches", () => expect(resolveTap(en0, vi0).kind).toBe("match"));
  it("cross-side different id misses", () => expect(resolveTap(en0, vi1).kind).toBe("miss"));
});

describe("tileVisual", () => {
  it("is normal when in neither list", () => expect(tileVisual("a", [], [])).toBe("normal"));
  it("is burst while bursting", () => expect(tileVisual("a", ["a"], [])).toBe("burst"));
  it("is gone once hidden", () => expect(tileVisual("a", [], ["a"])).toBe("gone"));
  it("gone wins over burst during the handoff", () =>
    expect(tileVisual("a", ["a"], ["a"])).toBe("gone"));
  it("leaves other keys untouched", () => expect(tileVisual("b", ["a"], ["a"])).toBe("normal"));
});
