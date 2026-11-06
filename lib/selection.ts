import { findChunkRanges } from "@/lib/content";
import type { Chunk, Passage } from "@/content/types";

/** Số từ tối đa để còn tra nghĩa được (đếm theo khoảng trắng). */
const MAX_LOOKUP_WORDS = 10;
/** Số ký tự tối đa của chữ tra — server cũng chặn đúng số này. */
export const MAX_LOOKUP_CHARS = 120;
/** Câu ngữ cảnh gửi AI dài tối đa chừng này ký tự (`sentenceAt` cắt khung quanh vùng chọn). */
const MAX_SENTENCE_CHARS = 600;

/** Gộp mọi khoảng trắng (kể cả xuống dòng) thành một dấu cách; không còn chữ/số nào thì trả "". */
export function normalizeSelectionText(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  return /[\p{L}\p{N}]/u.test(text) ? text : "";
}

/** Đếm từ theo khoảng trắng. */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Chỉ tra nghĩa khi cụm đủ ngắn (≤ 10 từ và ≤ 120 ký tự). */
export function canLookUp(text: string): boolean {
  return countWords(text) <= MAX_LOOKUP_WORDS && text.length <= MAX_LOOKUP_CHARS;
}

/**
 * Câu chứa vùng chọn [start, end) trong `caption`: lùi tới sau `[.?!]` + khoảng trắng gần nhất (hoặc sau `\n`,
 * hoặc đầu chuỗi), tiến tới hết `[.?!]` đầu tiên (kèm `"`/`”` đóng liền sau) có khoảng trắng/hết chuỗi theo sau
 * (hoặc trước `\n`, hoặc cuối chuỗi). Trả về đã `normalizeSelectionText`.
 */
export function sentenceAt(caption: string, start: number, end: number): string {
  let from = 0;
  for (let i = start - 1; i >= 0; i--) {
    const c = caption[i];
    if (c === "\n") {
      from = i + 1;
      break;
    }
    if (/\s/.test(c) && i > 0 && /[.?!]/.test(caption[i - 1])) {
      from = i + 1;
      break;
    }
  }
  let to = caption.length;
  for (let i = Math.max(end, from); i < caption.length; i++) {
    const c = caption[i];
    if (c === "\n") {
      to = i;
      break;
    }
    if (/[.?!]/.test(c)) {
      let j = i + 1;
      if (caption[j] === '"' || caption[j] === "”") j++;
      if (j >= caption.length || /\s/.test(caption[j])) {
        to = j;
        break;
      }
    }
  }
  const sentence = normalizeSelectionText(caption.slice(from, to));
  if (sentence.length <= MAX_SENTENCE_CHARS) return sentence;
  // Câu quá dài (server chặn > 600): lấy khung ≤ 600 ký tự quanh vùng chọn, cắt ở khoảng trắng để vẫn là một đoạn của nguyên văn.
  let a = Math.max(from, start - Math.floor((MAX_SENTENCE_CHARS - (end - start)) / 2));
  let b = Math.min(to, a + MAX_SENTENCE_CHARS);
  a = Math.max(from, b - MAX_SENTENCE_CHARS);
  if (a > from) {
    const ws = caption.slice(a, start).search(/\s/);
    if (ws >= 0) a += ws + 1;
  }
  if (b < to) {
    const tail = caption.slice(end, b);
    const ws = Math.max(tail.lastIndexOf(" "), tail.lastIndexOf("\n"), tail.lastIndexOf("\t"));
    if (ws >= 0) b = end + ws;
  }
  return normalizeSelectionText(caption.slice(a, b));
}

/** Cụm soạn sẵn của đoạn mà vùng chọn [start, end) (bỏ khoảng trắng đầu/cuối) nằm trọn trong; không có thì null. */
export function chunkAt(passage: Passage, start: number, end: number): Chunk | null {
  const raw = passage.caption.slice(start, end);
  const s = start + (raw.length - raw.trimStart().length);
  const e = end - (raw.length - raw.trimEnd().length);
  const hit = findChunkRanges(passage.caption, passage.chunks).find((r) => r.start <= s && e <= r.end);
  return hit?.chunk ?? null;
}

/** Link tra từ điển Cambridge cho cụm đã chọn. */
export function lookupUrl(text: string): string {
  return `https://dictionary.cambridge.org/search/english/?q=${encodeURIComponent(text)}`;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Đặt popup cạnh vùng chọn: canh giữa theo chiều ngang, kẹp để cách mép màn hình ≥ `margin`.
 * Chọn phía một lần cho mỗi vùng chọn (thẻ tra nghĩa mở ra sẽ giữ phía đó): ưu tiên phía trên (cách `gap`)
 * nếu ở đó đủ `wantRoom` cho thẻ hoặc rộng hơn phía dưới; phía trên không chứa nổi cả popup thì lật xuống.
 * `minTop` / `maxBottom`: mép dưới header / mép trên footer dính (toạ độ viewport).
 * Mọi `Box` theo toạ độ viewport; kết quả theo toạ độ trong container (cho `position: absolute`):
 * `anchor` = mép popup sát vùng chọn (mép dưới nếu ở trên, mép trên nếu ở dưới) — popup lớn lên về phía xa
 * vùng chọn, hàng nút đứng yên; `room` = chiều cao tối đa popup được chiếm ở phía đó.
 */
export function placePopup(a: {
  sel: Box;
  container: Box;
  popup: { width: number; height: number };
  viewportWidth: number;
  minTop: number;
  maxBottom: number;
  wantRoom?: number;
  gap?: number;
  margin?: number;
}): { left: number; top: number; below: boolean; anchor: number; room: number } {
  const { sel, container, popup, viewportWidth, minTop, maxBottom, wantRoom = 0, gap = 10, margin = 8 } = a;
  const centered = sel.left + sel.width / 2 - popup.width / 2;
  const maxLeft = viewportWidth - margin - popup.width;
  const left = Math.max(margin, Math.min(centered, maxLeft));
  const aboveEdge = sel.top - gap;
  const belowEdge = sel.top + sel.height + gap;
  const roomAbove = aboveEdge - minTop;
  const roomBelow = maxBottom - belowEdge;
  const below = roomAbove < popup.height || (roomAbove < wantRoom && roomAbove < roomBelow);
  const edge = below ? belowEdge : aboveEdge;
  return {
    left: left - container.left,
    top: (below ? belowEdge : aboveEdge - popup.height) - container.top,
    below,
    anchor: edge - container.top,
    room: below ? roomBelow : roomAbove,
  };
}
