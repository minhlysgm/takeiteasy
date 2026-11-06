// v2: thẻ ch01-p01..03 đã thay hẳn nội dung (vẽ trước). Khoá cũ không version thì bỏ qua để ai cũng được xem vẽ lại.
const PREFIX = "tie:sketch-seen:v2:";

export function sketchSeenKey(passageId: string): string {
  return PREFIX + passageId;
}

/** Passage này đã vẽ hình rồi chưa. Storage bị chặn → coi như chưa xem để hình vẫn chạy. */
export function isSketchSeen(passageId: string): boolean {
  try {
    return localStorage.getItem(sketchSeenKey(passageId)) === "1";
  } catch {
    return false;
  }
}

export function markSketchSeen(passageId: string): void {
  try {
    localStorage.setItem(sketchSeenKey(passageId), "1");
  } catch {
    /* ignore */
  }
}
