# TakeItEasy — Pivot sang Reading Reader học tiếng Anh (Design Spec)

**Ngày:** 2026-08-25
**Trạng thái:** Đã duyệt qua thảo luận (4 phần), chờ review lần cuối trên file
**Mockup đã duyệt:** https://claude.ai/code/artifact/64cfb883-b366-480b-8dfa-616faeb7846c

## 1. Bối cảnh & tầm nhìn

Pivot hoàn toàn: bỏ concept game hiện tại, thay bằng một **web đọc sách song ngữ để học tiếng Anh**, số hóa đúng workflow học đã được chủ dự án kiểm chứng trên bản thân (đọc từng đoạn 4-5 câu → hiểu nghĩa theo ngữ cảnh → phân tích chunk/pattern để chống quên). Giá trị cốt lõi không phải bản dịch, mà là **bước phân tích chunk** — nếu chỉ đọc bản dịch, người học quên ngay.

Aesthetic: **terminal/coding** (hướng A đã chọn trên mockup) — tránh cảm giác LMS, và các hiệu ứng (typing, underline tay vẽ, mũi tên) có giá trị sư phạm: dẫn mắt người đọc theo nhịp của nội dung, mô phỏng cảm giác có người thầy đang cầm bút chỉ vào trang.

### Đối tượng & lộ trình

- **v1: tool cá nhân** — chỉ chủ dự án dùng. Không auth, không server-side logic.
- **Sau này: public.** Khi đó KHÔNG ship kèm nội dung sách có bản quyền (mua sách ≠ quyền tái xuất bản; kể cả kèm bản dịch — bản dịch là tác phẩm phái sinh). Con đường public: user tự dán nội dung của họ, hoặc cung cấp sách public domain (Project Gutenberg). Kiến trúc "nội dung tách khỏi code" (mục 3) chống lưng cho cả hai hướng.

### Trong scope v1

1. Màn hình đọc focus từng đoạn: 2 cột (nguyên văn trái, bản dịch phải), hiệu ứng typing
2. Explain mode: underline tay vẽ + mũi tên + ghi chú lề, drawer phân tích chunk
3. Speech: tô đen để nghe (Web Speech API), đọc cả đoạn, nghe ví dụ trong drawer
4. Kệ sách + điều hướng chương/đoạn, lưu tiến độ localStorage
5. Dark theme mặc định + light theme (design tokens từ ngày đầu)
6. Nội dung: soạn sẵn bằng ChatGPT, lưu file TS có schema trong repo

### Ngoài scope v1 (có chủ đích)

- **Ghi âm + chấm điểm phát âm** — nâng cao, có thể tốn phí; làm sau
- **Trang admin quản lý nội dung** — làm sau; schema (mục 4) chính là hợp đồng cho nó
- Gọi LLM trực tiếp từ web, auth/account, mobile-first (chỉ cần không vỡ layout)

## 2. Quyết định nền tảng

- **Giữ repo + stack hiện tại**: Next.js 16 (App Router) + React 19 + Tailwind + Vitest. Xóa sạch code game cũ (PlayScreen, BossScreen, SummaryScreen, orchestrator...) trong bước triển khai. Next.js chừa đường cho tương lai (admin, API route, auth) mà v1 không phải trả chi phí gì.
- **Thư viện mới duy nhất: `rough-notation`** (~4KB, không dependency) cho underline tay vẽ — tự xử lý chunk vắt dòng (multiline). Mũi tên tay vẽ: tự làm bằng SVG animate `stroke-dashoffset`. Typing: hook tự viết. Speech: Web Speech API có sẵn của browser. Cả ba đều miễn phí, không cần server.
- **Fonts**: IBM Plex Mono (mono chính — có hỗ trợ tiếng Việt), Patrick Hand (ghi chú viết tay — có hỗ trợ tiếng Việt), qua Google Fonts với fallback stack.

## 3. Kiến trúc màn hình & cấu trúc code

### Routes

- `/` — **kệ sách**: danh sách sách (v1: 1 cuốn), mỗi cuốn liệt kê chương, hiện tiến độ "đang đọc dở ch.01 · đoạn 3/12 — đọc tiếp →". Style terminal như file listing.
- `/read/[bookId]/[chapterId]/[passageIndex]` — **màn hình đọc**. Vị trí đọc nằm trong URL: refresh không mất chỗ, bookmark/share được.

### Cấu trúc thư mục

```
app/
  page.tsx                    # kệ sách
  read/[bookId]/[chapterId]/[passageIndex]/page.tsx   # màn hình đọc
components/
  reader/                     # PassageView, TypingText, AnnotationLayer,
                              # MarginNote, ChunkDrawer, SpeechTooltip...
content/
  types.ts                    # schema (mục 4)
  books/
    the-subtle-art/
      book.ts                 # metadata: tựa, tác giả, danh sách chương
      ch01.ts                 # mảng Passage của chương 1
lib/
  theme.css                   # design tokens: dark (mặc định) + light
  speech.ts                   # wrapper Web Speech API
  progress.ts                 # tiến độ đọc, localStorage
```

**Nguyên tắc bất di bất dịch:** `content/` là dữ liệu thuần, không JSX. Component chỉ nhận dữ liệu và render. Trang admin sau này chỉ cần sinh đúng format file; chuyển sang "user tự dán nội dung" chỉ đổi nguồn dữ liệu — reader không đổi.

**Theme:** toàn bộ màu qua CSS variables (`--bg`, `--text`, `--accent`, `--ink`...). Dark là bộ giá trị mặc định; light tái dụng bảng màu "giấy" của hướng B mockup. Typography giữ nguyên mono ở cả hai theme. Phím `t` chuyển theme.

## 4. Schema nội dung

Lưu bằng **file TypeScript** (không JSON) để được type-check lúc build.

```ts
// content/types.ts

interface Book {
  id: string;                // "the-subtle-art"
  title: string;
  author: string;
  chapters: { id: string; title: string; passageCount: number }[];
}

interface Passage {
  id: string;                // "ch01-p03"
  original: string;          // đoạn tiếng Anh nguyên văn
  translation: string;       // bản dịch tự nhiên (nguồn cho hiệu ứng typing)
  mainIdea?: string;         // "ý chính của đoạn" — vài câu tiếng Việt
  chunks: Chunk[];
}

interface Chunk {
  id: string;                // "stem-from"
  match: string;             // chuỗi khớp NGUYÊN VĂN trong original: "stemmed not from"
  occurrence?: number;       // mặc định 1 — khi chuỗi xuất hiện nhiều lần
  label: string;             // ghi chú lề ngắn: "stem from = bắt nguồn từ"

  // nội dung drawer:
  headword: string;          // "stem from something"
  meaning: string;           // "= bắt nguồn từ / xuất phát từ"
  pattern?: { formula: string; note: string };  // "not from A, but from B" + giải thích
  examples: { en: string; vi: string }[];
  mistake?: { wrong: string; right: string };   // "despite of the rain" → "despite the rain"
  note?: string;             // giải thích thêm tự do
}
```

Ba quyết định:

1. **Neo chunk bằng `match` + `occurrence`, không dùng chỉ số ký tự.** Offset giòn (sửa một dấu phẩy là lệch hết) và người không đọc được; `match` thì người đọc hiểu, ChatGPT sinh được, admin validate được. Reader tự tìm chuỗi trong `original` để vẽ.
2. **Test nội dung** (mục 6) là hàng rào chính chống nội dung sai.
3. **Drawer map 1-1 với format phân tích ChatGPT** đang dùng (nghĩa → pattern → ví dụ Anh-Việt → lỗi hay gặp) — soạn nội dung mới chỉ là "xuất ra đúng format này".

## 5. Luồng tương tác & hiệu ứng

### Vòng đời một đoạn

```
vào trang → nguyên văn hiện → bản dịch typing → idle (đọc)
                                                  ↓ [e]
                                        explain: underline + mũi tên lần lượt
                                                  ↓ bấm chunk / ghi chú lề
                                               drawer mở
```

### Typing (bản dịch)

- Hook `useTypingText`: ~25ms/ký tự, jitter nhẹ.
- **Skip được**: phím bất kỳ hoặc click vào block dịch → hiện toàn bộ ngay.
- Typing xong → block `// ý chính` (mainIdea) fade-in dưới bản dịch.
- `prefers-reduced-motion` → mọi hiệu ứng thành hiện-ngay.

### Explain mode `[e]`

- Underline: rough-notation, vẽ **lần lượt** từng chunk (~400ms/chunk) — nhịp người thầy đánh dấu bài, không đồng loạt.
- Ghi chú lề (`chunk.label`): lề trái, canh theo dòng chứa chunk (đo `getBoundingClientRect`), Patrick Hand, fade-in sau khi underline của nó vẽ xong.
- Mũi tên: SVG overlay phủ vùng đọc, đường cong từ mép ghi chú → vị trí thật của chunk (tính từ DOM lúc chạy — resize thì tính lại), animate `stroke-dashoffset`.
- Bản dịch mờ xuống (~0.3 opacity) khi explain bật. `[esc]` tắt annotation, về trạng thái đọc.
- Toàn bộ đo đạc DOM cô lập trong component `AnnotationLayer` — phần khác không phụ thuộc.

### Drawer

- Bấm chunk hoặc ghi chú lề → drawer trượt từ phải (~500px), nền đọc dịu xuống.
- Nội dung theo schema: headword, meaning, pattern box, examples (kèm nút nghe), mistake box.
- `j`/`k` chunk trước/sau, `esc` đóng. Focus vào drawer khi mở, trả về vị trí cũ khi đóng.

### Speech

- `lib/speech.ts`: một hàm `speak(text)` — chọn voice `en-US`/`en-GB` có sẵn, rate ~0.9.
- Tô đen trong nguyên văn → tooltip phía trên vùng chọn (`Range.getBoundingClientRect`): **nghe** / **tra nghĩa** (v1: mở Cambridge Dictionary tab mới).
- `[s]` đọc cả đoạn nguyên văn. Nút nghe trong drawer đọc câu ví dụ.

### Bàn phím tổng (hiện ở footer)

`←`/`→` hoặc `enter` chuyển đoạn · `e` explain · `s` đọc cả đoạn · `esc` thoát mode · `j`/`k` trong drawer · `t` đổi theme

## 6. Testing

1. **Test nội dung (hàng rào chính):** quét toàn bộ `content/` — mỗi `chunk.match` tồn tại trong `original` đúng số lần `occurrence`, examples không rỗng, id không trùng. Fail báo rõ đoạn/chunk nào sai.
2. **Unit test logic thuần:** `useTypingText` (fake timers: gõ dần, skip), thuật toán tìm vị trí chunk, `progress.ts`, `speech.ts` (mock `speechSynthesis`).
3. **Component test:** PassageView render đúng 2 cột; `e` hiện annotation; bấm chunk mở drawer đúng nội dung; `esc`/`j`/`k` hoạt động.
4. **Không test pixel/hình dạng nét vẽ** — kiểm bằng mắt. `AnnotationLayer` chỉ test phần tính toán chunk → tọa độ.

## 7. Error handling

Nguyên tắc: **tính năng phụ hỏng thì tự ẩn, không kéo sập trải nghiệm đọc.**

1. `speechSynthesis` thiếu hoặc không có voice EN → nút speech disabled kèm chú thích ngắn.
2. `chunk.match` không khớp lúc runtime → bỏ qua chunk đó + `console.warn`, chunk khác vẫn hiện (hàng rào thứ hai sau test).
3. localStorage bị chặn (private mode) → try/catch, mất lưu tiến độ nhưng app vẫn đọc được.
4. URL đoạn/chương không tồn tại → chuyển về đoạn hợp lệ gần nhất, không trang trắng.

## 8. Nội dung khởi điểm v1

Chương 1 của "The Subtle Art of Not Giving a F*ck" — các đoạn chủ dự án đã học qua ChatGPT (bắt đầu với đoạn Bukowski làm đoạn mẫu chuẩn). Nội dung chỉ nằm trong repo cá nhân, không public — xem mục 1 về bản quyền.
