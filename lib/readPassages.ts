const KEY = "tie:read";

type ReadMap = Record<string, unknown>;

function readAll(): ReadMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    return data && typeof data === "object" && !Array.isArray(data) ? (data as ReadMap) : {};
  } catch {
    return {}; // localStorage bị chặn / dữ liệu hỏng — app vẫn chạy
  }
}

function clean(list: unknown): number[] {
  if (!Array.isArray(list)) return [];
  const nums = list.filter((n): n is number => Number.isInteger(n) && n >= 1);
  return [...new Set(nums)].sort((a, b) => a - b);
}

/** Các đoạn (1-based) đã mở trong chương, sắp tăng dần. */
export function getReadPassages(bookId: string, chapterId: string): number[] {
  return clean(readAll()[`${bookId}/${chapterId}`]);
}

export function markPassageRead(bookId: string, chapterId: string, passageIndex: number): void {
  if (!Number.isInteger(passageIndex) || passageIndex < 1) return;
  try {
    const all = readAll();
    const key = `${bookId}/${chapterId}`;
    const list = clean(all[key]);
    if (list.includes(passageIndex)) return;
    all[key] = [...list, passageIndex].sort((a, b) => a - b);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode: mất ghi nhớ đoạn đã mở, không sao */
  }
}
