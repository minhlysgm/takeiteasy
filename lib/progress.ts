export interface Progress {
  bookId: string;
  chapterId: string;
  passageIndex: number; // 1-based
}

const KEY = "tie:progress";

export function getProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Progress;
    if (
      typeof p?.bookId !== "string" ||
      typeof p?.chapterId !== "string" ||
      typeof p?.passageIndex !== "number"
    ) {
      return null;
    }
    return p;
  } catch {
    return null; // localStorage bị chặn / dữ liệu hỏng — app vẫn chạy
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: mất lưu tiến độ, không sao */
  }
}
