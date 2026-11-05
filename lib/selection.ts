/** Số từ tối đa để còn tra nghĩa được (đếm theo khoảng trắng). */
const MAX_LOOKUP_WORDS = 5;

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

/** Chỉ tra nghĩa khi cụm đủ ngắn (≤ 5 từ). */
export function canLookUp(text: string): boolean {
  return countWords(text) <= MAX_LOOKUP_WORDS;
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
 * Đặt popup cạnh vùng chọn: canh giữa theo chiều ngang, ưu tiên phía trên (cách `gap`),
 * không đủ chỗ (dưới `minTop`) thì lật xuống dưới. Kẹp ngang để popup cách mép màn hình ≥ `margin`.
 * Mọi `Box` theo toạ độ viewport; kết quả theo toạ độ trong container (cho `position: absolute`).
 */
export function placePopup(a: {
  sel: Box;
  container: Box;
  popup: { width: number; height: number };
  viewportWidth: number;
  minTop: number;
  gap?: number;
  margin?: number;
}): { left: number; top: number; below: boolean } {
  const { sel, container, popup, viewportWidth, minTop, gap = 10, margin = 8 } = a;
  const centered = sel.left + sel.width / 2 - popup.width / 2;
  const maxLeft = viewportWidth - margin - popup.width;
  const left = Math.max(margin, Math.min(centered, maxLeft));
  const above = sel.top - popup.height - gap;
  const below = above < minTop;
  const top = below ? sel.top + sel.height + gap : above;
  return { left: left - container.left, top: top - container.top, below };
}
