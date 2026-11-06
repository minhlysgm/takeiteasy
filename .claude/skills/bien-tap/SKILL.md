---
name: bien-tap
description: Quy trình biên tập nội dung thẻ "vẽ trước" của takeiteasy. Dùng MỖI KHI Minh gửi ảnh chụp / đoạn chữ trong sách, nói "biên tập", "làm thẻ", "thẻ mới", "thẻ tiếp", "biên tập tiếp", "sửa thẻ chXX-tYY", "đang biên tập tới đâu", hoặc góp ý câu chữ / hình của một thẻ.
---

# Biên tập thẻ

Mỗi thẻ = một khoảng đoạn sách liền nhau (thường 2–3 đoạn; 1 đoạn được nếu tự đủ một ý) → hiểu ý → kể lại bằng
**hình + lời của takeiteasy**. Đây là nội dung chính của dự án:
làm **đúng thứ tự trạm**, **không đoán** — mọi thứ đã làm nằm trong file, không nằm trong trí nhớ session.

## Nơi lưu (nguồn sự thật)

| File | Là gì | Commit? |
|---|---|---|
| `docs/content/<sách>/SO-THE.md` | Sổ thẻ: thông tin sách, bảng thẻ (tự sinh), đoạn bỏ qua, ghi chú | có |
| `docs/content/<sách>/cards/<id>.md` | Một thẻ: trạng thái, nguồn, tóm ý, hướng kể, nội dung, nhật ký. Mẫu: `mau-the.md` cạnh skill này | có |
| `docs/content/<sách>/cards/<id>.sketch.json` | Hình, đúng kiểu `Sketch` trong `content/types.ts` | có |
| `content-src/<sách>/<id>.md` (+ ảnh `<id>-1.jpg`…) | Chữ sách Minh gửi, chép lại | **KHÔNG** (gitignored) |

`id` = `ch<chương 2 số>-t<số thẻ 2 số>`, ví dụ `ch01-t04`. Nguồn ghi `tr.<trang>¶<đoạn>` — ¶ đếm các đoạn
**bắt đầu** trên trang đó (đoạn tràn từ trang trước thuộc trang trước). Trang theo bản sách giấy ghi trong SO-THE.md.

Công cụ: `npm run content -- status | new <chương> "<nguồn>" | check [id] [--fast] | preview <id> | ledger`.

## Bước 0 — luôn làm trước

1. `npm run content -- status` và đọc `SO-THE.md` (phần Ghi chú + Đoạn bỏ qua).
2. Minh nói về một thẻ "đang dở" (trạm ①–⑤) → đọc file thẻ đó (trạng thái + Nhật ký) → **làm tiếp từ trạm ghi
   trong file**, không làm lại trạm trước trừ khi Minh bảo. Thẻ ⑥ là đã xong phần biên tập — chỉ mở lại khi Minh bảo.
3. `status` báo thiếu bản sách giấy → hỏi Minh (không chặn việc), rồi sửa dòng đó trong SO-THE.md thành
   `(chưa có — đã hỏi YYYY-MM-DD)` để session sau không hỏi lại; Minh trả lời thì ghi bản sách vào.
4. Có file trong `content-src/<sách>/_cho/` → đó là chữ sách Minh gửi mà chưa vào thẻ nào: nhắc Minh.
5. Báo Minh 1–2 dòng: đã phủ tới đâu, thẻ nào dở, mình sắp làm gì (gộp chung tin nhắn với câu hỏi nếu có).

## Các trạm (ghi `trang-thai` + một dòng Nhật ký mỗi khi qua trạm, rồi `npm run content -- ledger`)

**① Nhận đoạn** — Minh gửi ảnh/chữ.
- Xác định khoảng nguồn (trang + ¶). Không đọc rõ chữ / không thấy số trang → hỏi Minh, **không đoán**.
- Lưu ngay chữ/ảnh Minh gửi vào `content-src/<sách>/_cho/<YYYY-MM-DD>-tr<trang>.md` (mỗi đoạn mở đầu `[tr.N ¶k]`)
  để đổi session không mất. Vào thẻ xong thì chuyển sang file của thẻ và xoá file `_cho`.
- `npm run content -- new <chương> "<nguồn>"`, ví dụ `new 1 "tr.3¶1 – tr.4¶2"` — kiểm trùng **trước khi tạo**:
  - ✗ trùng → không có file nào được tạo. **Dừng**, nói Minh đoạn nào đã thuộc thẻ nào (kèm ý của thẻ đó), và
    phần chưa ai phủ (dòng "chưa ai phủ" của công cụ). Đưa lựa chọn, khuyên một cái: (a) thẻ mới chỉ lấy phần
    chưa phủ, (b) gộp vào thẻ cũ (phải mở lại thẻ đó), (c) ghi phần chưa phủ vào "Đoạn bỏ qua". Minh chọn.
    Phần chưa phủ chỉ còn 1 đoạn: khuyên (a) nếu đoạn đó có ý riêng, khác ý thẻ cũ; ý mỏng thì xin Minh gửi thêm
    đoạn kế để gộp.
  - ✓ → đã tạo `cards/<id>.md` từ mẫu. Chép chữ sách vào `content-src/<sách>/<id>.md`: **chỉ** các đoạn trong
    khoảng nguồn, mỗi đoạn mở đầu `[tr.N ¶k]`. Ảnh lưu cạnh nó (`<id>-1.jpg`…). `ledger`.

**② Tóm ý** — viết vào thẻ, rồi gửi Minh trong chat:
- `## Tóm ý tác giả`: 3–5 gạch **tiếng Việt, bằng lời mình**, ý chứ không dịch câu. Đánh dấu ý nào đáng giữ / bỏ.
- So với cột "Ý" của bảng thẻ: trùng ý thẻ cũ → nói rõ "giống ý ch01-t02", đề xuất góc khác hoặc bỏ.
- `## Hướng kể`: 2–3 hướng, mỗi hướng = góc nhìn 1 câu + cảnh hình 1 câu + 4 chunk ứng viên. Hướng khuyên dùng đặt đầu, ghi "(khuyên dùng)".
- Thảo luận với Minh cho tới khi hiểu đúng ý tác giả. `trang-thai: 2 tóm ý`.

**③ Chốt hướng** _(cổng: Minh chọn)_ — đánh "← chốt" cạnh hướng Minh chọn, ghi `y:` (ý của thẻ, 1 dòng),
Nhật ký "Minh chốt hướng X". `trang-thai: 3 chốt hướng`. Chưa có lời Minh chọn → không sang ④.

**④ Nháp** — viết đủ thẻ theo mẫu + vẽ `<id>.sketch.json`:
- Chỉ dùng ý từ các đoạn trong `nguon` của thẻ — ý của đoạn khác thuộc thẻ khác.
- Đoạn văn: 3–5 câu, 55–80 từ, tiếng Anh dễ (A2–B1), **tả hình + bình**, giọng nhẹ nhàng như review. Không chép
  câu chữ sách; trích nguyên văn tối đa 1 câu ngắn, trong ngoặc kép, nêu tác giả.
- 4 chunk: cụm đời thường dùng được ngay, `Khớp` là chữ **y hệt** trong đoạn văn, 2 ví dụ **chuyện đời thường**
  (không coding), có `Hay sai` nếu người Việt hay nhầm. Không lặp chunk đã dạy ở thẻ khác.
- Hình: `viewBox` "0 0 520 340"; nét `tone: "line"`, điểm nhấn/mũi chỉ `tone: "ink"`; ≤ 6 nhãn, mỗi nhãn ≤ 4 chữ,
  là lời của mình, chữ `size: 21` (`SKETCH_TEXT_SIZE` — nhỏ hơn thì điện thoại khó đọc; nhãn dài thì ngắt 2 dòng);
  nhãn ở khoảng trống, trong khung 520×340, cách mọi nét ≥ 6, mũi chỉ bắt đầu cách chữ; `alt` tiếng Việt tả cảnh.
- `npm run content -- check <id>` cho tới khi không còn ✗ → `npm run content -- preview <id>` → đăng file html
  bằng Artifact (cập nhật lại cùng artifact ở các vòng sau) → gửi link + tóm tắt ngắn. `trang-thai: 4 nháp`.

**⑤ Minh sửa** — Minh là người chốt chữ.
- Áp **đúng chữ Minh viết**. Thấy lỗi ngữ pháp / chunk không còn khớp → nói ra và đề xuất, không tự sửa im lặng.
- Mỗi vòng sửa: `check <id>` → `preview` → đăng lại → ghi Nhật ký "Minh sửa: …". `trang-thai: 5 Minh sửa`.

**⑥ Soát** _(cổng: Minh duyệt)_ — `check <id>` sạch ✗; đọc từng ⚠ và xử lý (hoặc ghi lý do giữ vào Nhật ký);
Minh nói "duyệt" → `trang-thai: 6 đã soát`, `ledger`, commit trên nhánh hiện tại, **chỉ** add
`docs/content/<sách>/` (không bao giờ `git add -A`, không add `content-src/`): `chore(content): <id> đã soát`.

**⑦ Vào app** — chỉ khi task "vẽ trước" đã merge. Chép thẻ sang `content/books/<sách>/chXX.ts` theo định dạng
trong code, chạy `npm run audio` (tạo file giọng cho câu mới), rồi `npm run verify`, theo skill `workflow` cho phần code (nhánh, test, Minh duyệt merge). `trang-thai: 7 trong app`.

## Luật cứng

- Chữ sách chỉ nằm trong `content-src/`. Không đưa vào `docs/`, commit, artifact, hay dán lại dài trong chat.
- Không dựa trí nhớ: trạng thái, nguồn đã phủ, chunk đã dạy → đọc từ `status`, SO-THE.md, file thẻ.
- Không nhảy trạm, không tự chốt thay Minh ở ③ và ⑥.
- Một đoạn sách chỉ thuộc một thẻ. Đoạn không làm thẻ → ghi vào "Đoạn bỏ qua" kèm lý do (để không bị làm lại).
- Thấy thẻ đã soát (⑥) có vấn đề (vd. dùng ý của đoạn ngoài nguồn) → nói Minh một câu, không tự sửa.

| Dấu hiệu sai | Làm đúng |
|---|---|
| "Đoạn này chắc chưa làm" | Chạy `new` — công cụ biết, mình không |
| Minh gửi ảnh mà mình viết luôn đoạn văn | Đi ① → ② → chờ Minh chốt ③ |
| Viết đoạn văn bằng cách đổi vài chữ trong câu sách | Viết từ **cảnh trong hình** + tóm ý tiếng Việt, không nhìn câu gốc |
| Sửa câu Minh đã viết cho "hay hơn" | Đề xuất trong chat, Minh đồng ý mới sửa |
| `check` còn ✗ nhưng gửi Minh xem | Sửa hết ✗ trước; ⚠ thì kể ra cho Minh |
