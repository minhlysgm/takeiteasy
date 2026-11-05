const PREFIX = "tie:sketch-seen:";

/** Passage này đã vẽ hình rồi chưa. Storage bị chặn → coi như chưa xem để hình vẫn chạy. */
export function isSketchSeen(passageId: string): boolean {
  try {
    return localStorage.getItem(PREFIX + passageId) === "1";
  } catch {
    return false;
  }
}

export function markSketchSeen(passageId: string): void {
  try {
    localStorage.setItem(PREFIX + passageId, "1");
  } catch {
    /* ignore */
  }
}
