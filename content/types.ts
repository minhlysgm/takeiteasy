export interface Book {
  id: string; // "the-subtle-art"
  title: string;
  author: string;
  chapters: { id: string; title: string; passageCount: number }[];
}

export interface Passage {
  id: string; // "ch01-p01"
  caption: string; // đoạn mô tả tiếng Anh do takeiteasy viết
  translation: string; // bản dịch tự nhiên (nguồn cho hiệu ứng typing)
  mainIdea?: string; // "ý chính của đoạn"
  chunks: Chunk[];
  sketch: Sketch; // hình phác thảo tự vẽ của đoạn — thẻ vẽ trước nên bắt buộc
}

export interface Chunk {
  id: string; // "is-a-mess"
  match: string; // chuỗi khớp NGUYÊN VĂN trong caption
  occurrence?: number; // mặc định 1 — khi chuỗi xuất hiện nhiều lần
  label: string; // ghi chú lề ngắn

  headword: string; // tựa trong drawer
  meaning: string;
  pattern?: { formula: string; note?: string };
  examples: { en: string; vi: string }[];
  mistake?: { wrong: string; right: string };
  note?: string;
}

export type SketchTone = "line" | "ink" | "name" | "accent"; // không có tone nhạt: chữ trong hình phải đọc được ở cả hai theme
export type SketchStep =
  | { kind: "path"; d: string; tone: "line" | "ink" | "accent"; width?: number; rough?: number; seed?: number; plain?: boolean }
  | { kind: "ellipse"; cx: number; cy: number; w: number; h: number; tone: "line" | "ink"; rough?: number; seed?: number; multi?: boolean }
  | { kind: "arrow"; points: [number, number, number, number, number, number, number, number]; tone: "ink" }
  | { kind: "text"; text: string; x: number; y: number; size: number; tone: SketchTone; anchor?: "start" | "middle" | "end" }
  | { kind: "pause"; ms: number };
export type Sketch = { viewBox: string; alt: string; steps: SketchStep[] }; // alt: mô tả tiếng Việt cho trình đọc màn hình
