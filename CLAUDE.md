# takeiteasy

Reader song ngữ giúp học tiếng Anh qua đọc sách: nguyên văn + bản dịch, các "chunk" đáng học được
gạch chân, ghi chú tay và drawer giải thích. Next.js 16 (App Router) · React 19 · Tailwind 3 · TypeScript.

## Cách làm việc — QUAN TRỌNG

- Chủ dự án là **Minh**: nói tiếng Việt, xưng "tui". Trả lời tiếng Việt, ngắn gọn, đời thường.
- Minh **không nhớ cú pháp**. Khi Minh nói "tiếp", "task tiếp theo", "làm tiếp", "ok/duyệt",
  "đang tới đâu rồi", hoặc mô tả task mới → **đọc `docs/workflow/STATE.md` rồi dùng skill `workflow`**.
- Quy trình 7 trạm: ① Nhận task → ② Làm rõ → ③ Chốt spec → ④ Plan → ⑤ Build → ⑥ Kiểm thử & soi UI → ⑦ Nghiệm thu.
  Chi tiết trong `.claude/skills/workflow/SKILL.md`.
- Minh thích phản biện kiểu Product Owner, duyệt từng phần, và **xem mockup trước khi chốt UI**.
- **Nội dung thẻ** (Minh gửi ảnh/đoạn sách, "biên tập", "làm thẻ", "thẻ tiếp", "biên tập tiếp", góp ý câu chữ/hình
  của một thẻ) → **dùng skill `bien-tap`**, không dùng `workflow`. "tiếp" trơn = `workflow` (task code trong STATE).

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server ở http://localhost:3000 |
| `npm test` | Unit test (vitest, `tests/`) |
| `npm run e2e` | E2E (Playwright, `e2e/`) — tự bật dev server nếu chưa chạy |
| `npm run lint` | ESLint (flat config `eslint.config.mjs`), cảnh báo cũng tính là hỏng |
| `npm run verify` | type-check + lint + unit + e2e — **bắt buộc xanh trước khi báo "xong"** |
| `npm run ui:snap` | Chụp màn hình desktop/mobile × sáng/tối vào `.ui-snaps/` |
| `npm run content -- status` | Sổ thẻ: đã biên tập tới đâu, thẻ nào dở (thêm `check [id]`, `preview <id>`, `ledger`) |
| `npm run audio` | Tạo file giọng ElevenLabs còn thiếu vào `public/audio/` (`--dry-run` xem trước số ký tự, `--prune` xoá file thừa) |

## Cấu trúc

- `app/` — route: `/` (kệ sách), `/read/[bookId]/[chapterId]/[passageIndex]` — màn đọc nằm ở `layout.tsx` của chương (`ChapterReader`) để sống xuyên các đoạn; page chỉ kiểm số đoạn
- `components/reader/` — PassageView (màn đọc, phím tắt), AnnotationLayer, ChunkDrawer, SelectionPopup / SelectionDock
- `components/shelf/` — BookShelf · `lib/` — content, progress (localStorage `tie:*`), theme, speech, selection, useTextSelection, useMediaQuery
- `content/books/<book>/` — dữ liệu sách (passage, chunk, ví dụ)
- `docs/content/<book>/` — biên tập thẻ: `SO-THE.md` (sổ thẻ) + `cards/<id>.md|.sketch.json` · `scripts/content/cards.ts` — công cụ soát
- `docs/superpowers/specs|plans/` — spec & plan đã duyệt · `docs/workflow/STATE.md` — trạng thái + backlog

## Quy ước

- Ví dụ trong nội dung chunk: **chuyện đời thường**, không lấy ví dụ coding.
- Nội dung là **hình + lời của takeiteasy**, sách chỉ là nguồn ý: không chép câu chữ sách (công cụ chặn ≥ 6 chữ
  liền, chữ trong hình ≥ 4); trích tối đa 1 câu ngắn trong ngoặc kép. Chữ sách gốc chỉ ở `content-src/` (gitignored).
- Chữ trong hình không bao giờ chạm nét vẽ (cách ≥ 6 đơn vị).
- Màu chỉ dùng token trong `lib/theme.css`; hỗ trợ cả theme sáng/tối; animation có `motion-reduce`.
- Test trước, code sau. Tiêu chí nghiệm thu trong spec ↔ test trong `e2e/`.
- Mỗi task một nhánh `task/<slug>`; commit nhỏ, message dạng `feat:` / `fix:` / `chore:`.
