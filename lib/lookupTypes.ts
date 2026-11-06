/** Kiểu dùng chung giữa client và server cho tính năng tra nghĩa (POST /api/lookup). */
export interface LookupRequest {
  bookId: string;
  chapterId: string;
  passageIndex: number;
  text: string;
  /** Vị trí vùng chọn trong `passage.caption` [start, end) — server tự cắt câu ngữ cảnh từ đây. */
  start: number;
  end: number;
}

export interface LookupResult {
  headword: string;
  ipa: string;
  pos: string;
  meaning: string;
  example: { en: string; vi: string };
}

export type LookupResponse =
  | { status: "ok"; result: LookupResult }
  | { status: "unavailable"; reason: "invalid" | "limited" | "paused" | "error" };
