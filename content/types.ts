export interface Book {
  id: string; // "the-subtle-art"
  title: string;
  author: string;
  chapters: { id: string; title: string; passageCount: number }[];
}

export interface Passage {
  id: string; // "ch01-p01"
  original: string; // đoạn tiếng Anh nguyên văn
  translation: string; // bản dịch tự nhiên (nguồn cho hiệu ứng typing)
  mainIdea?: string; // "ý chính của đoạn"
  chunks: Chunk[];
}

export interface Chunk {
  id: string; // "stem-from"
  match: string; // chuỗi khớp NGUYÊN VĂN trong original
  occurrence?: number; // mặc định 1 — khi chuỗi xuất hiện nhiều lần
  label: string; // ghi chú lề ngắn

  headword: string; // tựa trong drawer
  meaning: string;
  pattern?: { formula: string; note: string };
  examples: { en: string; vi: string }[];
  mistake?: { wrong: string; right: string };
  note?: string;
}
