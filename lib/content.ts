import type { Book, Chunk, Passage } from "@/content/types";
import { theSubtleArt, theSubtleArtPassages } from "@/content/books/the-subtle-art/book";

export const books: Book[] = [theSubtleArt];

const passagesByBook: Record<string, Record<string, Passage[]>> = {
  [theSubtleArt.id]: theSubtleArtPassages,
};

/** Nhãn hiển thị của chương: "ch01" → "chương 1". Id trong URL/data vẫn giữ nguyên. */
export function chapterLabel(chapterId: string): string {
  const n = chapterId.match(/\d+/);
  return n ? `chương ${Number(n[0])}` : chapterId;
}

export function getBook(bookId: string): Book | undefined {
  return books.find((b) => b.id === bookId);
}

export function getPassages(bookId: string, chapterId: string): Passage[] | undefined {
  return passagesByBook[bookId]?.[chapterId];
}

/** passageIndex là 1-based (URL: /read/the-subtle-art/ch01/3). */
export function getPassage(bookId: string, chapterId: string, passageIndex: number): Passage | undefined {
  const list = getPassages(bookId, chapterId);
  if (!list || !Number.isInteger(passageIndex)) return undefined;
  return list[passageIndex - 1];
}

export interface ChunkRange { chunk: Chunk; start: number; end: number }

export function findChunkRange(original: string, chunk: Chunk): ChunkRange | null {
  const wanted = chunk.occurrence ?? 1;
  let from = 0;
  for (let n = 1; ; n++) {
    const at = original.indexOf(chunk.match, from);
    if (at === -1) return null;
    if (n === wanted) return { chunk, start: at, end: at + chunk.match.length };
    from = at + 1;
  }
}

/** Hàng rào thứ hai sau test nội dung: chunk không khớp thì bỏ qua, không crash reader. */
export function findChunkRanges(original: string, chunks: Chunk[]): ChunkRange[] {
  const out: ChunkRange[] = [];
  for (const chunk of chunks) {
    const r = findChunkRange(original, chunk);
    if (r) out.push(r);
    else console.warn(`chunk "${chunk.id}": match "${chunk.match}" không có trong original`);
  }
  return out.sort((a, b) => a.start - b.start);
}
