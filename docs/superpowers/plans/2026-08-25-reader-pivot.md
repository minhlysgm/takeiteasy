# Reader Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay toàn bộ game hiện tại bằng reader song ngữ học tiếng Anh phong cách terminal (2 cột, typing effect, explain mode với annotation tay vẽ, drawer phân tích chunk, speech).

**Architecture:** Next.js App Router; trang đọc là client component nhận dữ liệu thuần từ `content/` (không JSX trong content). Mọi hiệu ứng chạy client-side, không server logic. Màu qua CSS variables (dark mặc định, light phụ). Đo đạc DOM cô lập trong `AnnotationLayer`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v3, Vitest + @testing-library/react, rough-notation, Web Speech API.

**Spec:** `docs/superpowers/specs/2026-08-25-reader-pivot-design.md`

## Global Constraints

- Node hiện có sẵn; stack giữ nguyên: `next@^16.2.10`, `react@^19.2.7`, `tailwindcss@^3.4.19`, `vitest@^4.1.10`. Dependency mới duy nhất được phép thêm: `rough-notation`, `@testing-library/react`, `@testing-library/dom` (dev).
- `content/` là dữ liệu thuần — TUYỆT ĐỐI không JSX, không import từ `components/`.
- **KHÔNG tự bịa thêm nội dung sách.** Văn bản sách duy nhất được dùng là đoạn Bukowski trong plan này (chủ dự án cung cấp). Không chép thêm đoạn nào của "The Subtle Art..." từ trí nhớ.
- Màu sắc trong component CHỈ dùng token classes (`bg-bg`, `text-ink`...) — không hardcode hex trong TSX.
- UI copy tiếng Việt, thường (không viết hoa đầu câu kiểu tít báo), phong cách terminal (`// nguyên văn`, `đoạn 3/12`).
- Mọi animation tôn trọng `prefers-reduced-motion` (qua `lib/motion.ts` hoặc CSS media query).
- `passageIndex` trong URL và interface là **1-based** (`/read/the-subtle-art/ch01/3` = đoạn 3).
- Path alias `@/` = repo root (đã có trong tsconfig + vitest.config).
- Sau mỗi task: `npm test` xanh (trừ Task 1 — xem trong task), commit đúng message ghi trong task.

---

### Task 1: Dọn code game + shell mới (theme tokens, fonts, layout)

**Files:**
- Delete: `components/game/`, `components/screens/`, `components/effects/`, `components/ui/`, `content/scenes/`, `content/types.ts`, `lib/useGame.ts`, `lib/sfx.ts`, `lib/matching.ts`, `lib/storage.ts`, `lib/speech.ts`, `tests/` (toàn bộ file test cũ)
- Keep: `vitest.setup.ts` (fix localStorage jsdom — cần cho Task 3), `vitest.config.ts`
- Create: `lib/theme.css`
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: —
- Produces: token classes Tailwind (`bg`, `surface`, `text`, `bright`, `muted`, `line`, `accent`, `ink`, `ink-strong`, `danger`, `sel`; font `font-mono`, `font-hand`), CSS vars cùng tên trong `lib/theme.css`, keyframes `blink` + class `animate-blink`, class `arrow-draw` trong `globals.css`. Theme chuyển bằng `document.documentElement.dataset.theme = "light" | "dark"`.

- [ ] **Step 1: Xóa code game**

```bash
git rm -r components/game components/screens components/effects components/ui content/scenes tests
git rm content/types.ts lib/useGame.ts lib/sfx.ts lib/matching.ts lib/storage.ts lib/speech.ts
```

- [ ] **Step 2: Viết `lib/theme.css`**

```css
/* Design tokens — dark là mặc định, light qua data-theme. */
:root,
:root[data-theme="dark"] {
  --bg: #0f1317;
  --surface: #141a21;
  --text: #d6dee6;
  --bright: #e6edf3;
  --muted: #7d8590;
  --line: #1f262e;
  --accent: #3fb950;
  --ink: #e3b341;
  --ink-strong: #f0c667;
  --danger: #f85149;
  --sel: #24415e;
}

:root[data-theme="light"] {
  --bg: #f6f3ec;
  --surface: #efeadf;
  --text: #44403c;
  --bright: #1c1917;
  --muted: #a8a29e;
  --line: #e2dccd;
  --accent: #b45309;
  --ink: #b45309;
  --ink-strong: #92400e;
  --danger: #b91c1c;
  --sel: #d3e3f5;
}
```

- [ ] **Step 3: Viết lại `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", text: "var(--text)",
        bright: "var(--bright)", muted: "var(--muted)", line: "var(--line)",
        accent: "var(--accent)", ink: "var(--ink)", "ink-strong": "var(--ink-strong)",
        danger: "var(--danger)", sel: "var(--sel)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "SF Mono", "Menlo", "monospace"],
        hand: ["var(--font-hand)", "Comic Sans MS", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Viết lại `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background: var(--bg); color: var(--text); }
::selection { background: var(--sel); color: var(--bright); }

@keyframes blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
.animate-blink { animation: blink 1.1s steps(1) infinite; }

/* mũi tên tay vẽ "đang được vẽ" — AnnotationLayer dùng */
@keyframes draw { to { stroke-dashoffset: 0; } }
.arrow-draw { stroke-dasharray: 600; stroke-dashoffset: 600; animation: draw 0.6s ease forwards; }

@media (prefers-reduced-motion: reduce) {
  .animate-blink { animation: none; }
  .arrow-draw { animation: none; stroke-dashoffset: 0; }
}
```

- [ ] **Step 5: Viết lại `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono, Patrick_Hand } from "next/font/google";
import "@/lib/theme.css";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
const hand = Patrick_Hand({
  subsets: ["latin", "vietnamese"],
  weight: "400",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "takeiteasy — đọc sách học tiếng Anh",
  description: "Đọc sách song ngữ, học chunk theo ngữ cảnh",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${mono.variable} ${hand.variable}`}>
      <body className="min-h-dvh bg-bg font-mono text-text">
        <main className="min-h-dvh">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: `app/page.tsx` tạm**

```tsx
export default function HomePage() {
  return <div className="p-10 text-sm text-muted">// takeiteasy — đang xây lại</div>;
}
```

- [ ] **Step 7: Build để xác nhận sạch**

Run: `npm run build`
Expected: build PASS, không còn reference tới file đã xóa. (`npm test` lúc này báo "No test files found" — chấp nhận được, Task 2 sẽ có test đầu tiên.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove game code, add terminal theme tokens + new app shell"
```

---

### Task 2: Schema nội dung + đoạn mẫu + lib/content + test nội dung

**Files:**
- Create: `content/types.ts`, `content/books/the-subtle-art/ch01.ts`, `content/books/the-subtle-art/book.ts`, `lib/content.ts`
- Test: `tests/content.test.ts`, `tests/chunk-ranges.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - Types `Book`, `Passage`, `Chunk` từ `@/content/types`
  - `books: Book[]`, `getBook(bookId: string): Book | undefined`, `getPassages(bookId: string, chapterId: string): Passage[] | undefined`, `getPassage(bookId: string, chapterId: string, passageIndex: number): Passage | undefined` (1-based), `interface ChunkRange { chunk: Chunk; start: number; end: number }`, `findChunkRange(original: string, chunk: Chunk): ChunkRange | null`, `findChunkRanges(original: string, chunks: Chunk[]): ChunkRange[]` (sorted theo `start`, bỏ qua chunk không khớp + `console.warn`) từ `@/lib/content`

- [ ] **Step 1: Viết `content/types.ts`**

```ts
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
```

- [ ] **Step 2: Viết `content/books/the-subtle-art/ch01.ts`** (nội dung do chủ dự án cung cấp — dùng đúng nguyên văn dưới đây, không thêm đoạn khác)

```ts
import type { Passage } from "@/content/types";

export const ch01Passages: Passage[] = [
  {
    id: "ch01-p01",
    original:
      "See, despite the book sales and the fame, Bukowski was a loser. He knew it, and his success stemmed not from some determination to be a winner, but from the fact that he knew he was a loser, accepted it, and then wrote honestly about it. He never tried to be anything other than what he was. The genius in Bukowski's work was not in overcoming unbelievable odds or developing himself into a shining literary light. It was the opposite. It was his simple ability to be completely unflinchingly honest with himself, especially about the worst parts of himself, and to share his failings without hesitation or doubt.",
    translation:
      "Thấy chưa, bất chấp doanh số sách và sự nổi tiếng, Bukowski vẫn là một kẻ thất bại. Ông biết điều đó, và thành công của ông không bắt nguồn từ một quyết tâm nào đó để trở thành người chiến thắng, mà từ chính việc ông biết mình là một kẻ thất bại, chấp nhận điều đó, rồi viết về nó một cách chân thật. Ông chưa bao giờ cố trở thành bất cứ ai khác ngoài chính con người vốn có của mình. Thiên tài trong các tác phẩm của Bukowski không nằm ở việc vượt qua những nghịch cảnh không tưởng hay biến bản thân thành một ngôi sao sáng của văn chương. Hoàn toàn ngược lại. Nó nằm ở khả năng đơn giản của ông: hoàn toàn, không chút nao núng, thành thật với chính mình — đặc biệt là về những phần tồi tệ nhất trong con người mình — và chia sẻ những thất bại, khuyết điểm của bản thân mà không hề do dự hay nghi ngờ.",
    mainIdea:
      "Đoạn mở đầu cho nghịch lý \"Don't try\": Bukowski thành công không phải vì cố trở thành winner, mà vì biết mình là loser, chấp nhận điều đó, và viết về nó một cách chân thật — không che giấu, không tô vẽ.",
    chunks: [
      {
        id: "despite",
        match: "despite",
        label: "despite + noun / V-ing = bất chấp, mặc dù",
        headword: "despite + noun / V-ing",
        meaning: "= mặc dù / bất chấp",
        examples: [
          { en: "Despite the rain, we went out.", vi: "Mặc dù trời mưa, chúng tôi vẫn ra ngoài." },
          { en: "Despite working hard, he didn't get the result he wanted.", vi: "Mặc dù làm việc chăm chỉ, anh ấy không đạt được kết quả mình mong muốn." },
        ],
        mistake: { wrong: "Despite of the rain", right: "Despite the rain" },
        note: "despite và in spite of nghĩa gần như nhau.",
      },
      {
        id: "stem-from",
        match: "stemmed not from",
        label: "stem from = bắt nguồn từ\nnot from A, but from B",
        headword: "stem from something",
        meaning: "= bắt nguồn từ / xuất phát từ",
        pattern: { formula: "stems not from A, but from B", note: "không bắt nguồn từ A, mà từ B" },
        examples: [
          { en: "The issue stems not from the frontend, but from the backend.", vi: "Vấn đề không nằm ở frontend, mà ở backend." },
          { en: "His confidence stems from years of experience.", vi: "Sự tự tin của anh ấy đến từ nhiều năm kinh nghiệm." },
        ],
      },
      {
        id: "anything-other-than",
        match: "anything other than what he was",
        label: "anything other than...\n= bất cứ gì khác ngoài...",
        headword: "be anything other than + noun",
        meaning: "= bất cứ thứ gì khác ngoài...",
        examples: [
          { en: "I don't want to be anything other than myself.", vi: "Tôi không muốn trở thành bất kỳ ai khác ngoài chính mình." },
          { en: "He never pretended to be anything other than a normal guy.", vi: "Anh ấy chưa bao giờ giả vờ mình là gì khác ngoài một người bình thường." },
        ],
      },
      {
        id: "unflinchingly",
        match: "unflinchingly honest",
        label: "unflinchingly\n= không hề nao núng",
        headword: "unflinchingly honest",
        meaning: "= thành thật tuyệt đối, không né tránh — mạnh hơn nhiều so với very honest",
        examples: [
          { en: "She was unflinchingly honest about her mistakes.", vi: "Cô ấy thành thật một cách không hề né tránh về những sai lầm của mình." },
        ],
      },
      {
        id: "without-hesitation",
        match: "without hesitation or doubt",
        label: "without hesitation\n= không chút do dự",
        headword: "without hesitation or doubt",
        meaning: "= không do dự, không chút nghi ngại",
        examples: [
          { en: "She agreed without hesitation.", vi: "Cô ấy đồng ý ngay, không hề do dự." },
          { en: "He answered without hesitation.", vi: "Anh ấy trả lời ngay lập tức, không chút do dự." },
        ],
      },
    ],
  },
];
```

- [ ] **Step 3: Viết `content/books/the-subtle-art/book.ts`**

```ts
import type { Book, Passage } from "@/content/types";
import { ch01Passages } from "./ch01";

export const theSubtleArtPassages: Record<string, Passage[]> = { ch01: ch01Passages };

export const theSubtleArt: Book = {
  id: "the-subtle-art",
  title: "The Subtle Art of Not Giving a F*ck",
  author: "Mark Manson",
  chapters: [{ id: "ch01", title: "Don't Try", passageCount: ch01Passages.length }],
};
```

- [ ] **Step 4: Viết failing tests** — `tests/chunk-ranges.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { Chunk } from "@/content/types";
import { findChunkRange, findChunkRanges } from "@/lib/content";

const chunk = (over: Partial<Chunk>): Chunk => ({
  id: "c", match: "x", label: "", headword: "", meaning: "", examples: [{ en: "e", vi: "v" }],
  ...over,
});

describe("findChunkRange", () => {
  it("tìm thấy lần xuất hiện đầu tiên", () => {
    expect(findChunkRange("a cat sat", chunk({ match: "cat" }))).toEqual({
      chunk: expect.objectContaining({ match: "cat" }), start: 2, end: 5,
    });
  });
  it("occurrence chọn lần xuất hiện thứ n", () => {
    const r = findChunkRange("the cat and the cat", chunk({ match: "cat", occurrence: 2 }));
    expect(r?.start).toBe(16);
  });
  it("trả null khi không khớp", () => {
    expect(findChunkRange("a cat", chunk({ match: "dog" }))).toBeNull();
  });
});

describe("findChunkRanges", () => {
  it("sort theo vị trí và bỏ qua chunk không khớp (kèm warn)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = findChunkRanges("the cat sat on the mat", [
      chunk({ id: "mat", match: "mat" }),
      chunk({ id: "dog", match: "dog" }),
      chunk({ id: "cat", match: "cat" }),
    ]);
    expect(out.map((r) => r.chunk.id)).toEqual(["cat", "mat"]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
```

`tests/content.test.ts` (hàng rào nội dung — quét mọi sách):

```ts
import { describe, expect, it } from "vitest";
import { books, findChunkRange, getPassages } from "@/lib/content";

describe("content validation", () => {
  it("có ít nhất 1 sách", () => {
    expect(books.length).toBeGreaterThan(0);
  });
  for (const book of books) {
    for (const chapter of book.chapters) {
      const passages = getPassages(book.id, chapter.id) ?? [];
      it(`${book.id}/${chapter.id}: passageCount khớp số đoạn thật`, () => {
        expect(passages.length).toBe(chapter.passageCount);
      });
      it(`${book.id}/${chapter.id}: id đoạn không trùng`, () => {
        const ids = passages.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
      for (const p of passages) {
        it(`${p.id}: chunks hợp lệ`, () => {
          const ids = p.chunks.map((c) => c.id);
          expect(new Set(ids).size, "id chunk trùng").toBe(ids.length);
          for (const c of p.chunks) {
            expect(findChunkRange(p.original, c), `chunk "${c.id}" — match "${c.match}" không có trong original`).not.toBeNull();
            expect(c.examples.length, `chunk "${c.id}" thiếu examples`).toBeGreaterThan(0);
          }
        });
      }
    }
  }
});
```

- [ ] **Step 5: Chạy để thấy fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/content'` (hoặc tương đương).

- [ ] **Step 6: Viết `lib/content.ts`**

```ts
import type { Book, Chunk, Passage } from "@/content/types";
import { theSubtleArt, theSubtleArtPassages } from "@/content/books/the-subtle-art/book";

export const books: Book[] = [theSubtleArt];

const passagesByBook: Record<string, Record<string, Passage[]>> = {
  [theSubtleArt.id]: theSubtleArtPassages,
};

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
```

- [ ] **Step 7: Chạy test pass**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 8: Commit**

```bash
git add content lib/content.ts tests
git commit -m "feat: content schema, sample Bukowski passage, chunk matching + content validation tests"
```

---

### Task 3: lib/progress.ts — tiến độ đọc

**Files:**
- Create: `lib/progress.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `interface Progress { bookId: string; chapterId: string; passageIndex: number }` (1-based), `getProgress(): Progress | null`, `saveProgress(p: Progress): void` từ `@/lib/progress`. Key localStorage: `"tie:progress"`.

- [ ] **Step 1: Viết failing test** — `tests/progress.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getProgress, saveProgress } from "@/lib/progress";

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("null khi chưa có gì", () => {
    expect(getProgress()).toBeNull();
  });
  it("lưu và đọc lại", () => {
    saveProgress({ bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 3 });
    expect(getProgress()).toEqual({ bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 3 });
  });
  it("null khi dữ liệu hỏng", () => {
    localStorage.setItem("tie:progress", "{not json");
    expect(getProgress()).toBeNull();
    localStorage.setItem("tie:progress", JSON.stringify({ bookId: 1 }));
    expect(getProgress()).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/progress.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết `lib/progress.ts`**

```ts
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
```

- [ ] **Step 4: Chạy test pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/progress.ts tests/progress.test.ts
git commit -m "feat: reading progress in localStorage"
```

---

### Task 4: lib/speech.ts — Web Speech API

**Files:**
- Create: `lib/speech.ts`
- Test: `tests/speech.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `isSpeechAvailable(): boolean`, `speak(text: string, opts?: { rate?: number }): void` (mặc định rate 0.9, lang en-US, cancel utterance trước đó, ưu tiên voice en-US → en-GB → en bất kỳ) từ `@/lib/speech`.

- [ ] **Step 1: Viết failing test** — `tests/speech.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSpeechAvailable, speak } from "@/lib/speech";

function stubSynth(voices: Partial<SpeechSynthesisVoice>[] = []) {
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => voices as SpeechSynthesisVoice[]),
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      lang = "";
      rate = 1;
      voice: unknown = null;
      constructor(text: string) { this.text = text; }
    },
  );
  return synth;
}

afterEach(() => vi.unstubAllGlobals());

describe("speech", () => {
  it("isSpeechAvailable false khi không có speechSynthesis", () => {
    expect(isSpeechAvailable()).toBe(false);
  });
  it("speak không throw khi không có speechSynthesis", () => {
    expect(() => speak("hello")).not.toThrow();
  });
  it("speak cancel trước rồi speak, rate mặc định 0.9, lang en-US", () => {
    const synth = stubSynth();
    speak("hello world");
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledOnce();
    const u = synth.speak.mock.calls[0][0];
    expect(u.text).toBe("hello world");
    expect(u.rate).toBe(0.9);
    expect(u.lang).toBe("en-US");
  });
  it("ưu tiên voice en-US rồi en-GB", () => {
    const gb = { lang: "en-GB" };
    const synth = stubSynth([{ lang: "vi-VN" }, gb]);
    speak("hi");
    expect(synth.speak.mock.calls[0][0].voice).toBe(gb);
  });
});
```

Lưu ý cho người viết: `vitest.setup.ts` gán jsdom window lên global — `window.speechSynthesis` chưa tồn tại trong jsdom nên `vi.stubGlobal("speechSynthesis", ...)` là cách stub đúng; code production phải check qua `"speechSynthesis" in window`... nhưng trong jsdom `window` chính là globalThis nên stubGlobal hoạt động.

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/speech.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết `lib/speech.ts`**

```ts
export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.speechSynthesis?.getVoices === "function";
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    null
  );
}

/** Đọc to `text` bằng giọng tiếng Anh. Tính năng phụ: mọi lỗi nuốt lặng lẽ, không kéo sập reader. */
export function speak(text: string, opts: { rate?: number } = {}): void {
  if (!isSpeechAvailable()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = opts.rate ?? 0.9; // chậm hơn bình thường một chút cho người học
    const v = pickVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Chạy test pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/speech.ts tests/speech.test.ts
git commit -m "feat: speech synthesis wrapper (en voice, rate 0.9, safe no-op)"
```

---

### Task 5: lib/motion.ts + lib/useTypingText.ts — hiệu ứng typing

**Files:**
- Create: `lib/motion.ts`, `lib/useTypingText.ts`
- Test: `tests/useTypingText.test.ts`
- Modify: `package.json` (thêm devDependency)

**Interfaces:**
- Consumes: —
- Produces: `prefersReducedMotion(): boolean` từ `@/lib/motion`; `useTypingText(text: string, opts?: { charMs?: number; enabled?: boolean }): { display: string; done: boolean; skip: () => void }` từ `@/lib/useTypingText` (`enabled: false` → hiện toàn bộ ngay; đổi `text` → gõ lại từ đầu).

- [ ] **Step 1: Cài testing-library (task đầu tiên cần render/renderHook)**

```bash
npm i -D @testing-library/react @testing-library/dom
```

- [ ] **Step 2: Viết failing test** — `tests/useTypingText.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypingText } from "@/lib/useTypingText";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useTypingText", () => {
  it("gõ dần từng ký tự rồi done", () => {
    const { result } = renderHook(() => useTypingText("abc", { charMs: 10 }));
    expect(result.current.display).toBe("");
    expect(result.current.done).toBe(false);
    act(() => vi.runAllTimers());
    expect(result.current.display).toBe("abc");
    expect(result.current.done).toBe(true);
  });
  it("skip hiện toàn bộ ngay", () => {
    const { result } = renderHook(() => useTypingText("hello", { charMs: 10 }));
    act(() => result.current.skip());
    expect(result.current.display).toBe("hello");
    expect(result.current.done).toBe(true);
  });
  it("enabled=false hiện ngay không cần timer", () => {
    const { result } = renderHook(() => useTypingText("xyz", { enabled: false }));
    expect(result.current.display).toBe("xyz");
    expect(result.current.done).toBe(true);
  });
  it("đổi text thì gõ lại từ đầu", () => {
    const { result, rerender } = renderHook(({ t }) => useTypingText(t, { charMs: 10 }), {
      initialProps: { t: "one" },
    });
    act(() => vi.runAllTimers());
    rerender({ t: "two" });
    expect(result.current.done).toBe(false);
    act(() => vi.runAllTimers());
    expect(result.current.display).toBe("two");
  });
});
```

- [ ] **Step 3: Chạy để thấy fail**

Run: `npm test tests/useTypingText.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 4: Viết `lib/motion.ts`**

```ts
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 5: Viết `lib/useTypingText.ts`**

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  charMs?: number;
  enabled?: boolean;
}

export function useTypingText(text: string, { charMs = 25, enabled = true }: Options = {}) {
  const [count, setCount] = useState(() => (enabled ? 0 : text.length));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = text.length;

  useEffect(() => {
    if (!enabled) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) {
        const jitter = charMs * (0.6 + Math.random() * 0.8); // nhịp gõ tự nhiên
        timer.current = setTimeout(tick, jitter);
      }
    };
    timer.current = setTimeout(tick, charMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, charMs, enabled]);

  const skip = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCount(total);
  }, [total]);

  return { display: text.slice(0, count), done: count >= total, skip };
}
```

- [ ] **Step 6: Chạy test pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/motion.ts lib/useTypingText.ts tests/useTypingText.test.ts
git commit -m "feat: typing effect hook + reduced-motion helper"
```

---

### Task 6: Kệ sách (app/page.tsx + BookShelf)

**Files:**
- Create: `components/shelf/BookShelf.tsx`
- Modify: `app/page.tsx`
- Test: `tests/bookshelf.test.tsx`

**Interfaces:**
- Consumes: `books`, types từ Task 2; `getProgress` từ Task 3
- Produces: `BookShelf({ books }: { books: Book[] })` client component. Route đọc dạng `/read/{bookId}/{chapterId}/{passageIndex}`.

- [ ] **Step 1: Viết failing test** — `tests/bookshelf.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BookShelf } from "@/components/shelf/BookShelf";
import { books } from "@/lib/content";
import { saveProgress } from "@/lib/progress";

describe("BookShelf", () => {
  beforeEach(() => localStorage.clear());

  it("hiện tựa sách, tác giả và link chương", () => {
    render(<BookShelf books={books} />);
    expect(screen.getByText(/The Subtle Art/)).toBeTruthy();
    expect(screen.getByText(/Mark Manson/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Don't Try/ });
    expect(link.getAttribute("href")).toBe("/read/the-subtle-art/ch01/1");
  });

  it("hiện 'đọc tiếp' đúng vị trí khi có tiến độ", async () => {
    saveProgress({ bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 1 });
    render(<BookShelf books={books} />);
    const resume = await screen.findByRole("link", { name: /đọc tiếp/ });
    expect(resume.getAttribute("href")).toBe("/read/the-subtle-art/ch01/1");
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/bookshelf.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 3: Viết `components/shelf/BookShelf.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Book } from "@/content/types";
import { getProgress, type Progress } from "@/lib/progress";

export function BookShelf({ books }: { books: Book[] }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(getProgress()), []);

  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <div className="mb-10 text-sm text-muted">// kệ sách</div>
      {books.map((book) => {
        const resume = progress && progress.bookId === book.id ? progress : null;
        return (
          <section key={book.id} className="mb-12">
            <h1 className="text-xl text-bright">{book.title}</h1>
            <div className="mt-1 text-sm text-muted">{book.author}</div>
            {resume && (
              <Link
                href={`/read/${book.id}/${resume.chapterId}/${resume.passageIndex}`}
                className="mt-4 block text-sm text-accent"
              >
                đang đọc dở {resume.chapterId} · đoạn {resume.passageIndex} — đọc tiếp →
              </Link>
            )}
            <ul className="mt-6 space-y-2">
              {book.chapters.map((ch) => (
                <li key={ch.id}>
                  <Link href={`/read/${book.id}/${ch.id}/1`} className="text-text hover:text-bright">
                    <span className="text-muted">{ch.id}</span> · {ch.title}{" "}
                    <span className="text-muted">· {ch.passageCount} đoạn</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Viết lại `app/page.tsx`**

```tsx
import { BookShelf } from "@/components/shelf/BookShelf";
import { books } from "@/lib/content";

export default function HomePage() {
  return <BookShelf books={books} />;
}
```

- [ ] **Step 5: Chạy test pass + build**

Run: `npm test && npm run build`
Expected: cả hai PASS.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/shelf tests/bookshelf.test.tsx
git commit -m "feat: bookshelf home with chapters and resume link"
```

---

### Task 7: Route đọc + PassageView lõi (2 cột, typing, điều hướng, phím)

**Files:**
- Create: `app/read/[bookId]/[chapterId]/[passageIndex]/page.tsx`, `components/reader/PassageView.tsx`, `components/reader/OriginalText.tsx`
- Test: `tests/passage-view.test.tsx`

**Interfaces:**
- Consumes: content API (Task 2), `useTypingText` + `prefersReducedMotion` (Task 5), `saveProgress` (Task 3), `speak` (Task 4)
- Produces:
  - `OriginalText({ passage, explainOn, onChunkClick }: { passage: Passage; explainOn: boolean; onChunkClick: (chunkId: string) => void })` — render original, mỗi chunk là `<span data-chunk-id="...">`
  - `PassageView({ book, chapterId, chapterTitle, passage, passageIndex, passageCount })` client component; giữ state `explainOn: boolean`, `drawerIndex: number | null`; expose ref container `data-testid="reader"` cho AnnotationLayer (Task 8) và cột nguyên văn `data-testid="original-col"` cho SpeechTooltip (Task 10). Task 8/9/10 sẽ chèn component vào các điểm treo đã để sẵn (comment `{/* AnnotationLayer */}` v.v.).
  - Phím xử lý tập trung tại PassageView: `enter`/`→` next, `←` prev, `e` explain, `s` đọc cả đoạn, `esc` thoát, phím bất kỳ khi đang typing = skip. (`t`, `j`/`k` thêm ở Task 9/11.)

- [ ] **Step 1: Viết failing test** — `tests/passage-view.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PassageView } from "@/components/reader/PassageView";
import { books, getPassages } from "@/lib/content";
import { getProgress } from "@/lib/progress";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const book = books[0];
const passages = getPassages(book.id, "ch01")!;

function renderView() {
  return render(
    <PassageView
      book={book}
      chapterId="ch01"
      chapterTitle="Don't Try"
      passage={passages[0]}
      passageIndex={1}
      passageCount={passages.length}
    />,
  );
}

describe("PassageView", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it("render nguyên văn và header đoạn", () => {
    renderView();
    expect(screen.getByTestId("original-col").textContent).toContain("Bukowski was a loser");
    expect(screen.getByText(/đoạn 1\/1/)).toBeTruthy();
  });

  it("lưu tiến độ khi mở đoạn", () => {
    renderView();
    expect(getProgress()).toEqual({ bookId: book.id, chapterId: "ch01", passageIndex: 1 });
  });

  it("phím bất kỳ khi đang typing thì skip (hiện đủ bản dịch)", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" });
    expect(screen.getByTestId("translation-col").textContent).toContain("chân thật");
  });

  it("enter chuyển đoạn khi typing đã xong", () => {
    renderView();
    fireEvent.keyDown(window, { key: "x" }); // skip typing
    fireEvent.keyDown(window, { key: "Enter" });
    // passageCount = 1 nên không push (clamp) — đổi hành vi nếu có thêm đoạn
    expect(push).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(push).not.toHaveBeenCalled(); // đang ở đoạn 1, không lùi được
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/passage-view.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 3: Viết `components/reader/OriginalText.tsx`**

```tsx
"use client";
import type { Passage } from "@/content/types";
import { findChunkRanges } from "@/lib/content";

interface Props {
  passage: Passage;
  explainOn: boolean;
  onChunkClick: (chunkId: string) => void;
}

export function OriginalText({ passage, explainOn, onChunkClick }: Props) {
  const ranges = findChunkRanges(passage.original, passage.chunks);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) parts.push(passage.original.slice(cursor, r.start));
    parts.push(
      <span
        key={r.chunk.id}
        data-chunk-id={r.chunk.id}
        className={explainOn ? "cursor-pointer text-ink-strong" : undefined}
        onClick={explainOn ? () => onChunkClick(r.chunk.id) : undefined}
      >
        {passage.original.slice(r.start, r.end)}
      </span>,
    );
    cursor = r.end;
  }
  if (cursor < passage.original.length) parts.push(passage.original.slice(cursor));
  return <div className="text-[17px] leading-[1.9] text-bright">{parts}</div>;
}
```

- [ ] **Step 4: Viết `components/reader/PassageView.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Book, Passage } from "@/content/types";
import { prefersReducedMotion } from "@/lib/motion";
import { saveProgress } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { useTypingText } from "@/lib/useTypingText";
import { OriginalText } from "./OriginalText";

interface Props {
  book: Book;
  chapterId: string;
  chapterTitle: string;
  passage: Passage;
  passageIndex: number; // 1-based
  passageCount: number;
}

export function PassageView({ book, chapterId, passage, passageIndex, passageCount }: Props) {
  const router = useRouter();
  const [explainOn, setExplainOn] = useState(false);
  const [drawerIndex, setDrawerIndex] = useState<number | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const typing = useTypingText(passage.translation, { enabled: !reduced });

  useEffect(() => {
    saveProgress({ bookId: book.id, chapterId, passageIndex });
  }, [book.id, chapterId, passageIndex]);

  useEffect(() => {
    const goTo = (i: number) => {
      if (i >= 1 && i <= passageCount) router.push(`/read/${book.id}/${chapterId}/${i}`);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!typing.done && e.key !== "Escape") {
        typing.skip();
        return;
      }
      if (drawerIndex !== null) {
        // Task 9 mở rộng: j/k/esc cho drawer
        if (e.key === "Escape") setDrawerIndex(null);
        return;
      }
      switch (e.key) {
        case "Enter":
        case "ArrowRight":
          goTo(passageIndex + 1);
          break;
        case "ArrowLeft":
          goTo(passageIndex - 1);
          break;
        case "e":
          setExplainOn((v) => !v);
          break;
        case "s":
          speak(passage.original);
          break;
        case "Escape":
          setExplainOn(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typing, drawerIndex, passageIndex, passageCount, book.id, chapterId, passage.original, router]);

  const openChunk = (chunkId: string) => {
    const i = passage.chunks.findIndex((c) => c.id === chunkId);
    if (i >= 0) setDrawerIndex(i);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-11 shrink-0 items-center gap-4 border-b border-line bg-surface px-5">
        <div className="flex gap-2" aria-hidden="true">
          <span className="block h-3 w-3 rounded-full bg-danger opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-ink opacity-70" />
          <span className="block h-3 w-3 rounded-full bg-accent opacity-70" />
        </div>
        <div className="grow text-center text-[13px] text-muted">
          takeiteasy — {book.id} / {chapterId} · đoạn {passageIndex}/{passageCount}
          {explainOn && <span className="text-ink"> · explain</span>}
        </div>
        <div className="w-14 shrink-0" />
      </header>

      <div ref={readerRef} data-testid="reader" className="relative grid grow grid-cols-[220px_1fr_1fr] px-8 py-12">
        <div aria-hidden="true" />
        <div data-testid="original-col" className="relative border-r border-line pr-12">
          <div className="mb-6 text-[13px] text-muted">
            {"// nguyên văn"}
            {explainOn && <span className="ml-3 text-ink">{passage.chunks.length} chunks đáng học</span>}
          </div>
          <OriginalText passage={passage} explainOn={explainOn} onChunkClick={openChunk} />
          {/* SpeechTooltip (Task 10) */}
        </div>
        <div
          data-testid="translation-col"
          className={`pl-12 transition-opacity ${explainOn ? "opacity-30" : ""}`}
          onClick={() => typing.skip()}
        >
          <div className="mb-6 flex items-baseline gap-3 text-[13px]">
            <span className="text-muted">{"// bản dịch"}</span>
            {!typing.done && <span className="text-xs text-accent">đang gõ…</span>}
          </div>
          <div className="text-[15.5px] leading-[2]">
            {typing.display}
            {!typing.done && (
              <span className="animate-blink ml-0.5 inline-block h-[19px] w-[9px] translate-y-[3px] bg-accent" />
            )}
          </div>
          {typing.done && passage.mainIdea && (
            <div className="mt-8 border-t border-line pt-5 text-[13.5px] leading-relaxed text-muted">
              <span className="text-accent">{"// ý chính"}</span>
              <p className="mt-2">{passage.mainIdea}</p>
            </div>
          )}
        </div>
        {/* AnnotationLayer (Task 8) */}
        {/* ChunkDrawer (Task 9) */}
      </div>

      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-line px-8 text-[13px] text-muted">
        <div className="flex items-center gap-5">
          <span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">e</kbd> giải thích</span>
          <span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">s</kbd> đọc to</span>
          <span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">enter</kbd> đoạn tiếp</span>
        </div>
        <div className="h-1 w-44 rounded bg-line">
          <div className="h-full rounded bg-accent" style={{ width: `${(passageIndex / passageCount) * 100}%` }} />
        </div>
        <div>đoạn {passageIndex}/{passageCount} · {chapterId}</div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Viết `app/read/[bookId]/[chapterId]/[passageIndex]/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { PassageView } from "@/components/reader/PassageView";
import { getBook, getPassages } from "@/lib/content";

interface Props {
  params: Promise<{ bookId: string; chapterId: string; passageIndex: string }>;
}

export default async function ReadPage({ params }: Props) {
  const { bookId, chapterId, passageIndex } = await params;
  const book = getBook(bookId);
  if (!book) redirect("/");
  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) redirect(`/read/${book.id}/${book.chapters[0].id}/1`);
  const passages = getPassages(book.id, chapter.id) ?? [];
  if (passages.length === 0) redirect("/");
  const idx = Number(passageIndex);
  if (!Number.isInteger(idx) || idx < 1 || idx > passages.length) {
    redirect(`/read/${book.id}/${chapter.id}/1`);
  }
  return (
    <PassageView
      book={book}
      chapterId={chapter.id}
      chapterTitle={chapter.title}
      passage={passages[idx - 1]}
      passageIndex={idx}
      passageCount={passages.length}
    />
  );
}
```

- [ ] **Step 6: Chạy test pass + build**

Run: `npm test && npm run build`
Expected: cả hai PASS.

- [ ] **Step 7: Commit**

```bash
git add app/read components/reader tests/passage-view.test.tsx
git commit -m "feat: reader route + PassageView core (two columns, typing, nav, keys)"
```

---

### Task 8: Explain mode — AnnotationLayer (underline tay vẽ, ghi chú lề, mũi tên)

**Files:**
- Create: `lib/annotate.ts`, `components/reader/AnnotationLayer.tsx`
- Modify: `components/reader/PassageView.tsx` (thay comment `{/* AnnotationLayer (Task 8) */}`), `package.json`
- Test: `tests/annotate.test.ts`, `tests/annotation-layer.test.tsx`

**Interfaces:**
- Consumes: `Chunk` type; container ref `readerRef` + spans `[data-chunk-id]` từ Task 7
- Produces:
  - `interface Pt { x: number; y: number }`, `buildArrowPath(from: Pt, to: Pt): string` (SVG cubic path), `layoutNotes(items: { id: string; y: number; height: number }[], gap?: number): Record<string, number>` (đẩy ghi chú xuống để không đè nhau) từ `@/lib/annotate`
  - `AnnotationLayer({ containerRef, chunks, onChunkClick }: { containerRef: React.RefObject<HTMLDivElement | null>; chunks: Chunk[]; onChunkClick: (chunkId: string) => void })` — render trong container `position: relative`

- [ ] **Step 1: Cài rough-notation**

```bash
npm i rough-notation
```

- [ ] **Step 2: Viết failing test cho phần hình học** — `tests/annotate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildArrowPath, layoutNotes } from "@/lib/annotate";

describe("buildArrowPath", () => {
  it("path cubic từ from tới to", () => {
    const d = buildArrowPath({ x: 200, y: 400 }, { x: 300, y: 200 });
    expect(d.startsWith("M 200 400 C ")).toBe(true);
    expect(d.endsWith("300 200")).toBe(true);
  });
});

describe("layoutNotes", () => {
  it("giữ nguyên khi không đè nhau", () => {
    expect(layoutNotes([
      { id: "a", y: 0, height: 50 },
      { id: "b", y: 100, height: 50 },
    ])).toEqual({ a: 0, b: 100 });
  });
  it("đẩy ghi chú sau xuống khi đè nhau (kèm gap)", () => {
    const out = layoutNotes([
      { id: "a", y: 0, height: 50 },
      { id: "b", y: 20, height: 50 },
    ], 10);
    expect(out.a).toBe(0);
    expect(out.b).toBe(60); // 0 + 50 + 10
  });
  it("input không cần sort sẵn", () => {
    const out = layoutNotes([
      { id: "b", y: 20, height: 50 },
      { id: "a", y: 0, height: 50 },
    ], 10);
    expect(out.a).toBe(0);
    expect(out.b).toBe(60);
  });
});
```

- [ ] **Step 3: Chạy để thấy fail**

Run: `npm test tests/annotate.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 4: Viết `lib/annotate.ts`**

```ts
export interface Pt {
  x: number;
  y: number;
}

/** Đường cong "tay vẽ" từ ghi chú lề tới chunk. */
export function buildArrowPath(from: Pt, to: Pt): string {
  const dx = Math.max(24, Math.abs(to.x - from.x) * 0.4);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y - 24}, ${to.x - dx} ${to.y + 28}, ${to.x} ${to.y}`;
}

/** Xếp ghi chú theo trục dọc: mỗi ghi chú nằm gần dòng chứa chunk nhất có thể, đẩy xuống nếu đè lên ghi chú trước. */
export function layoutNotes(
  items: { id: string; y: number; height: number }[],
  gap = 10,
): Record<string, number> {
  const out: Record<string, number> = {};
  let cursor = -Infinity;
  for (const it of [...items].sort((a, b) => a.y - b.y)) {
    const y = Math.max(it.y, cursor);
    out[it.id] = y;
    cursor = y + it.height + gap;
  }
  return out;
}
```

- [ ] **Step 5: Chạy annotate test pass**

Run: `npm test tests/annotate.test.ts`
Expected: PASS.

- [ ] **Step 6: Viết failing component test** — `tests/annotation-layer.test.tsx` (mock rough-notation vì jsdom không có SVG geometry):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { AnnotationLayer } from "@/components/reader/AnnotationLayer";
import { books, getPassages } from "@/lib/content";

const annotate = vi.fn(() => ({ remove: vi.fn() }));
const show = vi.fn();
vi.mock("rough-notation", () => ({
  annotate: (...args: unknown[]) => annotate(...args),
  annotationGroup: () => ({ show }),
}));

const passage = getPassages(books[0].id, "ch01")![0];

function Host() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative">
      {passage.chunks.map((c) => (
        <span key={c.id} data-chunk-id={c.id}>{c.match}</span>
      ))}
      <AnnotationLayer containerRef={ref} chunks={passage.chunks} onChunkClick={() => {}} />
    </div>
  );
}

describe("AnnotationLayer", () => {
  it("gọi rough-notation cho từng chunk và show group", () => {
    render(<Host />);
    expect(annotate).toHaveBeenCalledTimes(passage.chunks.length);
    expect(show).toHaveBeenCalledOnce();
  });
  it("render ghi chú lề bấm được cho từng chunk", () => {
    render(<Host />);
    for (const c of passage.chunks) {
      // label nhiều dòng: chỉ cần dòng đầu xuất hiện
      expect(screen.getAllByText(new RegExp(c.label.split("\n")[0].slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 7: Chạy để thấy fail**

Run: `npm test tests/annotation-layer.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 8: Viết `components/reader/AnnotationLayer.tsx`**

```tsx
"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { annotate, annotationGroup } from "rough-notation";
import type { Chunk } from "@/content/types";
import { buildArrowPath, layoutNotes } from "@/lib/annotate";
import { prefersReducedMotion } from "@/lib/motion";

const MARGIN_W = 220; // khớp cột lề trong PassageView
const NOTE_H = 56;

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chunks: Chunk[];
  onChunkClick: (chunkId: string) => void;
}

interface NotePos {
  chunk: Chunk;
  noteY: number;
  arrow: string;
}

export function AnnotationLayer({ containerRef, chunks, onChunkClick }: Props) {
  const [notes, setNotes] = useState<NotePos[]>([]);

  // 1) underline tay vẽ, lần lượt từng chunk
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = prefersReducedMotion();
    const marks = chunks
      .map((c) => container.querySelector<HTMLElement>(`[data-chunk-id="${c.id}"]`))
      .filter((el): el is HTMLElement => el !== null)
      .map((el) =>
        annotate(el, {
          type: "underline",
          color: "var(--ink)",
          strokeWidth: 2,
          animationDuration: 400,
          animate: !reduced,
          multiline: true,
        }),
      );
    const group = annotationGroup(marks);
    group.show();
    return () => marks.forEach((m) => m.remove());
  }, [chunks, containerRef]);

  // 2) đo vị trí chunk → ghi chú lề + mũi tên; tính lại khi resize
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const compute = () => {
      const cRect = container.getBoundingClientRect();
      const raw = chunks.flatMap((c) => {
        const el = container.querySelector<HTMLElement>(`[data-chunk-id="${c.id}"]`);
        if (!el) return [];
        const r = el.getBoundingClientRect();
        return [{ chunk: c, y: r.top - cRect.top, x: r.left - cRect.left, bottom: r.bottom - cRect.top }];
      });
      const ys = layoutNotes(raw.map((r) => ({ id: r.chunk.id, y: r.y, height: NOTE_H })));
      setNotes(
        raw.map((r) => ({
          chunk: r.chunk,
          noteY: ys[r.chunk.id],
          arrow: buildArrowPath(
            { x: MARGIN_W - 20, y: ys[r.chunk.id] + 14 },
            { x: r.x, y: r.bottom + 6 },
          ),
        })),
      );
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [chunks, containerRef]);

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
          </marker>
        </defs>
        {notes.map((n) => (
          <path
            key={n.chunk.id}
            d={n.arrow}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            className="arrow-draw"
          />
        ))}
      </svg>
      {notes.map((n) => (
        <button
          key={n.chunk.id}
          type="button"
          onClick={() => onChunkClick(n.chunk.id)}
          className="absolute left-4 w-[190px] whitespace-pre-line text-left font-hand text-[17px] leading-snug text-ink"
          style={{ top: n.noteY, transform: "rotate(-1.5deg)" }}
        >
          {n.chunk.label}
        </button>
      ))}
    </>
  );
}
```

- [ ] **Step 9: Gắn vào PassageView** — thay comment `{/* AnnotationLayer (Task 8) */}` bằng:

```tsx
{explainOn && (
  <AnnotationLayer containerRef={readerRef} chunks={passage.chunks} onChunkClick={openChunk} />
)}
```

và thêm import `import { AnnotationLayer } from "./AnnotationLayer";`.

- [ ] **Step 10: Chạy toàn bộ test + build**

Run: `npm test && npm run build`
Expected: PASS. Lưu ý: test PassageView cũ vẫn phải xanh (explain mặc định off nên không đụng rough-notation).

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json lib/annotate.ts components/reader tests/annotate.test.ts tests/annotation-layer.test.tsx
git commit -m "feat: explain mode — rough-notation underlines, margin notes, hand-drawn arrows"
```

---

### Task 9: ChunkDrawer — phân tích chunk đầy đủ

**Files:**
- Create: `components/reader/ChunkDrawer.tsx`
- Modify: `components/reader/PassageView.tsx` (thay comment `{/* ChunkDrawer (Task 9) */}`, mở rộng phím j/k)
- Test: `tests/chunk-drawer.test.tsx`

**Interfaces:**
- Consumes: `Chunk` type, `speak`/`isSpeechAvailable` (Task 4), state `drawerIndex` + `setDrawerIndex` từ PassageView
- Produces: `ChunkDrawer({ chunks, index, onNavigate, onClose }: { chunks: Chunk[]; index: number; onNavigate: (i: number) => void; onClose: () => void })` — panel absolute bên phải, focus vào khi mở, trả focus khi đóng.

- [ ] **Step 1: Viết failing test** — `tests/chunk-drawer.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChunkDrawer } from "@/components/reader/ChunkDrawer";
import { books, getPassages } from "@/lib/content";

const chunks = getPassages(books[0].id, "ch01")![0].chunks;

describe("ChunkDrawer", () => {
  it("hiện headword, meaning, pattern và ví dụ của chunk đang chọn", () => {
    const stemIdx = chunks.findIndex((c) => c.id === "stem-from");
    render(<ChunkDrawer chunks={chunks} index={stemIdx} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByText("stem from something")).toBeTruthy();
    expect(screen.getByText(/bắt nguồn từ/)).toBeTruthy();
    expect(screen.getByText(/not from A, but from B/)).toBeTruthy();
    expect(screen.getByText(/stems not from the frontend/)).toBeTruthy();
  });
  it("hiện mistake box khi có", () => {
    const despiteIdx = chunks.findIndex((c) => c.id === "despite");
    render(<ChunkDrawer chunks={chunks} index={despiteIdx} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Despite of the rain/)).toBeTruthy();
  });
  it("nút đóng gọi onClose, nút chunk sau gọi onNavigate", () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={onNavigate} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /đóng/ }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /chunk sau/ }));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
  it("focus vào drawer khi mở", () => {
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/chunk-drawer.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 3: Viết `components/reader/ChunkDrawer.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { Chunk } from "@/content/types";
import { isSpeechAvailable, speak } from "@/lib/speech";

interface Props {
  chunks: Chunk[];
  index: number;
  onNavigate: (i: number) => void;
  onClose: () => void;
}

export function ChunkDrawer({ chunks, index, onNavigate, onClose }: Props) {
  const chunk = chunks[index];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);

  if (!chunk) return null;
  const speechOk = isSpeechAvailable();

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={chunk.headword}
      className="absolute inset-y-0 right-0 flex w-[500px] flex-col gap-6 overflow-y-auto border-l border-line bg-surface p-10 shadow-2xl outline-none"
    >
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{`// chunk ${index + 1}/${chunks.length}`}</span>
        <button type="button" onClick={onClose} className="hover:text-bright">
          đóng <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">esc</kbd>
        </button>
      </div>

      <div>
        <h2 className="text-[22px] font-medium text-ink-strong">{chunk.headword}</h2>
        <p className="mt-2 text-[15px] text-bright">{chunk.meaning}</p>
      </div>

      {chunk.pattern && (
        <div className="border border-dashed border-accent p-5">
          <div className="text-xs tracking-widest text-accent">PATTERN</div>
          <div className="mt-2 text-[16px] text-bright">{chunk.pattern.formula}</div>
          <div className="mt-1 text-[13.5px] text-muted">{chunk.pattern.note}</div>
        </div>
      )}

      <div>
        <div className="mb-3 text-[13px] text-muted">{"// ví dụ"}</div>
        <ul className="space-y-4">
          {chunk.examples.map((ex) => (
            <li key={ex.en}>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => speak(ex.en)}
                  disabled={!speechOk}
                  aria-label={`nghe: ${ex.en}`}
                  className="mt-1 shrink-0 text-accent disabled:opacity-40"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
                  </svg>
                </button>
                <div>
                  <div className="text-[14.5px] text-bright">{ex.en}</div>
                  <div className="text-[13px] text-muted">{ex.vi}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {chunk.mistake && (
        <div className="border border-danger/50 bg-danger/5 p-4">
          <div className="text-xs tracking-widest text-danger">LỖI HAY GẶP</div>
          <div className="mt-2 text-[14px] text-muted">
            sai: <span className="line-through">{chunk.mistake.wrong}</span> · đúng:{" "}
            <span className="text-bright">{chunk.mistake.right}</span>
          </div>
        </div>
      )}

      {chunk.note && <p className="text-[13.5px] leading-relaxed text-muted">{chunk.note}</p>}

      <div className="mt-auto flex items-center justify-between text-[13px] text-muted">
        <button
          type="button"
          onClick={() => onNavigate(Math.max(0, index - 1))}
          disabled={index === 0}
          className="disabled:opacity-40"
        >
          ← chunk trước <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">k</kbd>
        </button>
        <button
          type="button"
          onClick={() => onNavigate(Math.min(chunks.length - 1, index + 1))}
          disabled={index === chunks.length - 1}
          className="disabled:opacity-40"
        >
          <kbd className="rounded border border-line px-1.5 py-0.5 text-xs">j</kbd> chunk sau →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Gắn vào PassageView** — thay comment `{/* ChunkDrawer (Task 9) */}` bằng:

```tsx
{drawerIndex !== null && (
  <ChunkDrawer
    chunks={passage.chunks}
    index={drawerIndex}
    onNavigate={setDrawerIndex}
    onClose={() => setDrawerIndex(null)}
  />
)}
```

thêm import `import { ChunkDrawer } from "./ChunkDrawer";`, và trong `onKey`, mở rộng nhánh `drawerIndex !== null`:

```tsx
if (drawerIndex !== null) {
  if (e.key === "Escape") setDrawerIndex(null);
  if (e.key === "j") setDrawerIndex(Math.min(passage.chunks.length - 1, drawerIndex + 1));
  if (e.key === "k") setDrawerIndex(Math.max(0, drawerIndex - 1));
  return;
}
```

(nhớ thêm `passage.chunks.length` vào dependency array nếu eslint yêu cầu — `passage` đã có trong deps qua `passage.original`, thay bằng để nguyên object `passage` trong deps cho gọn).

- [ ] **Step 5: Chạy toàn bộ test + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/reader tests/chunk-drawer.test.tsx
git commit -m "feat: chunk drawer with pattern, examples, mistakes, j/k navigation"
```

---

### Task 10: SpeechTooltip — tô đen để nghe / tra nghĩa

**Files:**
- Create: `components/reader/SpeechTooltip.tsx`
- Modify: `components/reader/PassageView.tsx` (thay comment `{/* SpeechTooltip (Task 10) */}`)
- Test: `tests/speech-tooltip.test.tsx`

**Interfaces:**
- Consumes: `speak`/`isSpeechAvailable` (Task 4); ref cột nguyên văn từ PassageView
- Produces: `SpeechTooltip({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> })` — lắng nghe `mouseup` trên document; hiện tooltip khi có selection không rỗng nằm trong container; nút "nghe" → `speak(text)`, nút "tra nghĩa" → mở `https://dictionary.cambridge.org/search/english/?q=<text>` tab mới.

- [ ] **Step 1: Viết failing test** — `tests/speech-tooltip.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { SpeechTooltip } from "@/components/reader/SpeechTooltip";

function Host() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} data-testid="col">
      <p>unflinchingly honest with himself</p>
      <SpeechTooltip containerRef={ref} />
    </div>
  );
}

function selectTextIn(el: Element, text: string) {
  const sel = window.getSelection()!;
  const node = el.querySelector("p")!.firstChild!;
  const start = node.textContent!.indexOf(text);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + text.length);
  sel.removeAllRanges();
  sel.addRange(range);
}

afterEach(() => window.getSelection()?.removeAllRanges());

describe("SpeechTooltip", () => {
  it("không hiện gì khi chưa có selection", () => {
    render(<Host />);
    fireEvent.mouseUp(document);
    expect(screen.queryByRole("button", { name: /nghe/ })).toBeNull();
  });
  it("hiện tooltip khi tô đen trong container", () => {
    render(<Host />);
    selectTextIn(screen.getByTestId("col"), "unflinchingly honest");
    fireEvent.mouseUp(document);
    expect(screen.getByRole("button", { name: /nghe/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /tra nghĩa/ })).toBeTruthy();
  });
  it("tra nghĩa mở Cambridge với query đã encode", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Host />);
    selectTextIn(screen.getByTestId("col"), "unflinchingly honest");
    fireEvent.mouseUp(document);
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(open).toHaveBeenCalledWith(
      "https://dictionary.cambridge.org/search/english/?q=unflinchingly%20honest",
      "_blank",
      "noopener",
    );
    open.mockRestore();
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/speech-tooltip.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 3: Viết `components/reader/SpeechTooltip.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { isSpeechAvailable, speak } from "@/lib/speech";

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Tip {
  text: string;
  x: number;
  y: number;
}

export function SpeechTooltip({ containerRef }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const onMouseUp = () => {
      const container = containerRef.current;
      const sel = window.getSelection();
      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setTip(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text || !container.contains(sel.anchorNode)) {
        setTip(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      setTip({
        text,
        x: rect.left - cRect.left + rect.width / 2,
        y: rect.top - cRect.top,
      });
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [containerRef]);

  if (!tip) return null;

  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-full border border-line bg-surface text-[13.5px] shadow-xl"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      <button
        type="button"
        onClick={() => speak(tip.text)}
        disabled={!isSpeechAvailable()}
        className="flex items-center gap-2 border-r border-line px-4 py-3 text-bright disabled:opacity-40"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.5v11l9-5.5z" fill="var(--accent)" />
        </svg>
        nghe
      </button>
      <button
        type="button"
        onClick={() =>
          window.open(
            `https://dictionary.cambridge.org/search/english/?q=${encodeURIComponent(tip.text)}`,
            "_blank",
            "noopener",
          )
        }
        className="flex items-center gap-2 px-4 py-3 text-bright"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" stroke="var(--ink)" strokeWidth="1.6" />
          <path d="M10.5 10.5 L14 14" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        tra nghĩa
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Gắn vào PassageView** — thay comment `{/* SpeechTooltip (Task 10) */}` bằng `<SpeechTooltip containerRef={originalColRef} />`, thêm `const originalColRef = useRef<HTMLDivElement>(null);` và gắn `ref={originalColRef}` vào div `data-testid="original-col"` (div này đã có `className="relative ..."`), thêm import.

- [ ] **Step 5: Chạy toàn bộ test + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/reader tests/speech-tooltip.test.tsx
git commit -m "feat: selection speech tooltip (listen + Cambridge lookup)"
```

---

### Task 11: Theme toggle (phím t, lưu localStorage)

**Files:**
- Create: `lib/useTheme.ts`
- Modify: `components/reader/PassageView.tsx` (case `"t"`), `components/shelf/BookShelf.tsx` (nút theme nhỏ ở góc)
- Test: `tests/useTheme.test.ts`

**Interfaces:**
- Consumes: token light trong `lib/theme.css` (Task 1)
- Produces: `useTheme(): { theme: "dark" | "light"; toggle: () => void }` từ `@/lib/useTheme` — set `document.documentElement.dataset.theme`, lưu key `"tie:theme"`.

- [ ] **Step 1: Viết failing test** — `tests/useTheme.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTheme } from "@/lib/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("mặc định dark và gắn data-theme", () => {
    renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("toggle sang light, lưu localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("tie:theme")).toBe("light");
  });
  it("đọc lại theme đã lưu", () => {
    localStorage.setItem("tie:theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `npm test tests/useTheme.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết `lib/useTheme.ts`**

```ts
"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "tie:theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark"; // SSR prerender: không có localStorage
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}
```

(Guard `typeof window === "undefined"` trong `readTheme` là bắt buộc: client component vẫn được Next prerender trên server, nơi không có `localStorage`.)

- [ ] **Step 4: Gắn vào PassageView** — trong `onKey`, thêm case:

```tsx
case "t":
  toggleTheme();
  break;
```

với `const { toggle: toggleTheme } = useTheme();` ở đầu component (import từ `@/lib/useTheme`; thêm `toggleTheme` vào dependency array của effect phím). Footer thêm hint: `<span><kbd className="rounded border border-line px-1.5 py-0.5 text-xs">t</kbd> theme</span>`.

- [ ] **Step 5: Gắn vào BookShelf** — thêm nút nhỏ cuối trang:

```tsx
const { theme, toggle } = useTheme();
// cuối JSX, trong container:
<button type="button" onClick={toggle} className="mt-16 text-xs text-muted hover:text-bright">
  theme: {theme} — bấm để đổi
</button>
```

(import `useTheme`.)

- [ ] **Step 6: Chạy toàn bộ test + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/useTheme.ts components tests/useTheme.test.ts
git commit -m "feat: dark/light theme toggle persisted in localStorage"
```

---

### Task 12: Kiểm tra tổng & đối chiếu mockup

**Files:**
- Modify: chỉ khi phát hiện lỗi ở các bước dưới

**Interfaces:**
- Consumes: toàn bộ Task 1-11
- Produces: app chạy được end-to-end, test + lint + build xanh

- [ ] **Step 1: Toàn bộ gate tự động**

Run: `npm test && npm run lint && npm run build`
Expected: cả ba PASS, không warning mới. Lỗi lint nhỏ (unused import, deps array) → sửa ngay trong task này.

- [ ] **Step 2: Chạy app thật và đối chiếu checklist**

Run: `npm run dev` rồi mở `http://localhost:3000`. Đối chiếu với mockup đã duyệt (https://claude.ai/code/artifact/64cfb883-b366-480b-8dfa-616faeb7846c):

1. Kệ sách hiện "The Subtle Art..." với ch01 · Don't Try · 1 đoạn; bấm vào → `/read/the-subtle-art/ch01/1`
2. Nguyên văn hiện trước; bản dịch gõ dần với con trỏ xanh nhấp nháy; bấm phím bất kỳ → hiện đủ + block `// ý chính`
3. `e` → underline vẽ lần lượt từng chunk, ghi chú viết tay ở lề trái, mũi tên cong chỉ đúng chunk, cột dịch mờ đi; `esc` → tắt
4. Bấm chunk hoặc ghi chú → drawer trượt phải đủ 5 mục (headword, meaning, pattern, ví dụ + nút nghe, mistake); `j`/`k` chuyển chunk; `esc` đóng
5. Tô đen cụm bất kỳ trong nguyên văn → tooltip nghe / tra nghĩa; "nghe" phát âm được; "tra nghĩa" mở Cambridge
6. `s` đọc cả đoạn; `t` đổi theme sáng/tối, refresh vẫn giữ theme
7. Quay về `/` → có dòng "đang đọc dở ch01 · đoạn 1 — đọc tiếp →"
8. URL bậy (`/read/xxx/yyy/99`) → tự về nơi hợp lệ, không trang trắng

- [ ] **Step 3: Sửa những gì lệch checklist (nếu có), chạy lại gate**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit cuối**

```bash
git add -A
git commit -m "chore: final verification pass for reader v1"
```
