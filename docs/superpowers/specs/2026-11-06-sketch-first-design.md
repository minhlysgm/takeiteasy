# Thẻ "vẽ trước" — spec

- Ngày: 2026-11-06 · Cỡ: L · UI
- Mockup concept: `2026-11-06-sketch-first-mockup.html` (artifact https://claude.ai/artifact/8MpYdGvnm4fvjqmEkLLbRR)
- Bản nháp nội dung 3 thẻ: `2026-11-06-sketch-first-cards.html` (artifact https://claude.ai/artifact/6FLi8XFG3Zme1uZpQFUHwi)

## Mục tiêu & lý do

App đang hiển thị **nguyên văn sách** *The Subtle Art of Not Giving a F\*ck* (Mark Manson, còn bản quyền) kèm bản
dịch tự làm. Mở cho user thật là sao chép + phát tán tác phẩm có bản quyền — dù miễn phí, dù đã mua sách giấy.
Viết lại bám từng đoạn ("diễn giải sát") vẫn rủi ro.

Đổi sang kiểu **review sách bằng hình**: mỗi thẻ là **một ý lớn của chương**, hình phác thảo do takeiteasy vẽ chạy
**trước**, vẽ xong hiện **đoạn tiếng Anh ngắn do takeiteasy viết** (tả + bình về hình), có chunk gạch chân, bản dịch,
ý chính và dòng ghi công. Sách chỉ còn là **nguồn ý tưởng**. Tinh thần: chia sẻ kiến thức, xem cho vui, **không áp
lực** (không đố, không bắt user tự tả). Mở đường cho affiliate sau này (review dẫn người đọc đi mua sách).

## Phạm vi

### A. Nội dung

> **Cập nhật 2026-11-06 (Minh):** 3 thẻ dưới đây là **nội dung tạm** để làm code. Nội dung thật làm riêng, từng
> thẻ một, theo skill `bien-tap`: mỗi thẻ ứng với 2–3 đoạn sách → thảo luận cho hiểu ý → Claude nháp → Minh trau chuốt.
> Sổ thẻ ở `docs/content/<sách>/SO-THE.md`, công cụ soát `npm run content`. Task code không chờ nội dung thật.

3 thẻ của chương 1 = 3 ý lớn của chương (không bám 3 đoạn đầu sách):

| Thẻ | Ý | Hình | Chunk |
|---|---|---|---|
| 1 | Bukowski: đời bê bết, bị từ chối mãi vẫn viết, không giả vờ | người gục bên bàn, chai rượu, vé cá ngựa, chồng thư "NO", bài thơ | is a mess · bet … on · pile up · give up |
| 2 | Lo vì mình đang lo — vòng lặp; chấp nhận thì dịu | cô gái thức lúc 3 giờ sáng, vòng mũi tên quay tròn | fall asleep · go round in circles · the harder…, the louder… · let it be |
| 3 | Càng đuổi theo cảm giác vui càng thấy thiếu | người với theo bóng bay "happy", người ngồi ghế đá cầm trà | chase · every time · a rough week · be okay with |

Mỗi thẻ có: đoạn tiếng Anh 4–5 câu (~55–80 từ), bản dịch, ý chính (tiếng Việt), 4 chunk (ghi chú lề, nghĩa, mẫu câu
nếu có, 2 ví dụ đời thường, lỗi hay sai nếu có), hình có `alt` tiếng Việt, dòng ghi công. Toàn văn nằm trong
bản nháp nội dung ở trên — sau khi Minh duyệt sẽ chép vào `content/books/the-subtle-art/ch01*.ts`.

**Quy tắc nội dung (ghi vào CLAUDE.md):**
- Không chép câu chữ của sách vào đoạn văn hay vào chữ trong hình. Sự thật đời thật (Bukowski nghiện rượu,
  cá ngựa, bị từ chối, làm thơ) thì kể tự do bằng lời của mình.
- Mỗi thẻ là một **ý** của chương, chọn lọc, ngắn hơn hẳn sách — không đi tuần tự từng đoạn.
- Muốn trích nguyên văn: tối đa một câu ngắn, trong ngoặc kép, ghi tác giả.
- Ví dụ trong chunk vẫn là chuyện đời thường.
- **Chữ trong hình không bao giờ chạm nét vẽ** (Minh, 2026-11-06): mỗi nhãn/ghi chú nằm ở khoảng trống, cách
  mọi nét ≥ 6 đơn vị (hệ toạ độ 520×340); mũi chỉ bắt đầu cách chữ; chữ viết bên trong vật (vd. "happy" trong
  bóng bay) cũng phải cách viền ≥ 6. Thêm viền nền quanh chữ (`paint-order: stroke`, màu nền) để dự phòng.
  Không đóng dấu chữ đè lên vật (đã bỏ chữ "NO" trên chồng thư).

### B. Màn đọc

1. **Thứ tự trong cột trái:** `// hình` (vẽ ngay khi mở thẻ) → `// mô tả` (đoạn tiếng Anh + chunk). Cột phải:
   bản dịch (vẫn hiệu ứng gõ) → ý chính → dòng ghi công. Mobile xếp một cột theo đúng thứ tự đó.
2. **Hình chạy trước:** mở thẻ là hình bắt đầu vẽ (vẫn chờ hình lọt khung nhìn ~90% như hiện tại, mobile cần
   khi hình nằm ở đầu trang thì gần như luôn lọt). Trong lúc vẽ, chỗ đoạn văn hiện "đang vẽ…", cột phải hiện
   "bản dịch hiện sau khi vẽ xong".
3. **Vẽ xong** (hoặc bấm "xem ngay ⏭" / bấm vào hình) → đoạn tiếng Anh hiện dần (fade ~0.5s), bản dịch bắt đầu gõ,
   ý chính + ghi công hiện khi gõ xong (như hiện tại).
4. **Thẻ đã xem** (`tie:sketch-seen:<id>`) hoặc **reduced-motion** → hiện đủ ngay, không chờ vẽ. "↻ vẽ lại" chỉ
   vẽ lại hình, không giấu lại đoạn văn.
5. **Tên gọi:** "đoạn" → "**thẻ**" ở header, footer, danh sách nhảy nhanh ("chương 1 · thẻ 2/3"); tiêu đề cột
   "// nguyên văn" → "// mô tả". URL giữ nguyên `/read/<book>/<chapter>/<n>`.
6. **Dòng ghi công** cuối cột phải mỗi thẻ: *"Ý tưởng từ chương 1, \<tên sách\> — \<tác giả\>. Hình và lời: takeiteasy."*
   (lấy từ dữ liệu sách/chương, không gõ cứng).
7. **Mẹo lần đầu** (FirstTimeHint) đổi chữ "nguyên văn" → "đoạn mô tả".
8. Chunk, ghi chú lề, drawer giải thích, bôi đen để nghe / tra nghĩa, phím tắt, danh sách nhảy nhanh (câu mở
   đầu lấy từ đoạn mô tả) — **giữ nguyên hành vi**, chỉ chạy trên nội dung mới.

### C. Dữ liệu & code

- `Passage.original` → đổi tên `caption` (đoạn mô tả do takeiteasy viết); cập nhật mọi chỗ đọc (OriginalText →
  CaptionText, ChapterReader, PassageView, selection, lookup server). testid `original-*` → `caption-*`.
- `PassageSketch` báo cho màn đọc khi vẽ xong (`onDone`), kể cả khi đã xem hoặc reduced-motion.
- Book thêm thông tin cho dòng ghi công nếu thiếu (tên sách, tác giả, tên chương đã có).
- Cache tra nghĩa đổi tiền tố `lookup:v1` → `lookup:v2` để bỏ các câu ngữ cảnh cũ.
- Sửa test unit + e2e đang dò câu chữ sách (~25 file) sang nội dung mới.

## Ngoài phạm vi

- Giọng đọc ElevenLabs + chọn giọng (task kế tiếp trong backlog — làm sau để audio đọc đúng nội dung mới).
- Affiliate / link mua sách.
- Thêm chương / thêm sách; đổi kệ sách sang dạng "review".
- Xoá nguyên văn sách khỏi lịch sử git (nếu repo công khai — tính riêng).
- Bước "user tự tả hình" (Minh đã bỏ).

## Quyết định đã chốt

- Concept "vẽ trước", kiểu review sách; không có bước tự tả (Minh, 2026-11-06).
- 3 thẻ = 3 ý lớn của chương, không bám 3 đoạn đầu (Minh chọn ở ②).
- Đoạn văn 4–5 câu, ~60–80 từ (Minh chọn ở ②). Bản nháp hiện 55–57 từ — Minh duyệt thì giữ.
- Claude viết nháp cả 3 thẻ, Minh duyệt một lượt (Minh chọn ở ②).
- Claude tự chọn: gọi "thẻ"; bản dịch giữ hiệu ứng gõ; thẻ đã xem hiện đủ ngay; bôi đen/tra nghĩa giữ nguyên.

## Tiêu chí nghiệm thu (mỗi dòng → một test e2e)

Desktop (1440×900):

1. Khi mở thẻ 1 lần đầu thì hình bắt đầu vẽ, đoạn mô tả chưa hiện (chỗ đó ghi "đang vẽ…") và cột phải ghi
   "bản dịch hiện sau khi vẽ xong".
2. Khi hình vẽ xong thì đoạn mô tả tiếng Anh hiện ra, bản dịch bắt đầu gõ; gõ xong thì hiện ý chính và dòng ghi công.
3. Khi đang vẽ mà bấm "xem ngay ⏭" thì hình hiện đủ ngay và đoạn mô tả + bản dịch hiện theo (như vẽ xong).
4. Khi mở lại một thẻ đã xem thì hình, đoạn mô tả, bản dịch hiện đủ ngay; bấm "↻ vẽ lại" thì hình vẽ lại còn
   đoạn mô tả vẫn hiện.
5. Khi bật `prefers-reduced-motion` thì mọi thứ hiện đủ ngay, không có animation.
6. Header/footer ghi "chương 1 · thẻ 2/3"; danh sách nhảy nhanh ghi "thẻ" và câu mở đầu lấy từ đoạn mô tả.
7. Dòng ghi công hiện đúng tên sách, tác giả, số chương ở cả 3 thẻ.
8. Chunk trong đoạn mô tả gạch chân, có số và ghi chú lề như hiện tại; bấm mở drawer đúng chunk.
9. Bôi đen một cụm trong đoạn mô tả thì popup nghe / tra nghĩa vẫn hoạt động (tra nghĩa gửi đúng vị trí).

Mobile (390×844):

10. Thứ tự từ trên xuống: hình → đoạn mô tả → bản dịch → ý chính → ghi công; hình vẽ khi mở thẻ.
11. Ở 320px không tràn ngang; header vẫn vừa "chương 1 · thẻ 2/3".

Nội dung (unit test):

12. Mọi `chunk.match` nằm trong `caption`; mỗi thẻ có hình, 3–5 câu, 4 chunk, mỗi chunk ≥ 2 ví dụ.
13. Không còn chuỗi nguyên văn của sách: test chặn một danh sách câu/cụm đặc trưng của sách cũ (vd. "a womanizer,
    a chronic gambler", "the perfect place to start", "rejection slips piled up", "Crude.", "Depraved.") xuất hiện
    trong caption hoặc chữ trong hình.
13b. (e2e, đo bằng trình duyệt) Khi hình vẽ xong thì không chữ nào trong hình của mọi thẻ nằm cách nét vẽ < 6
    đơn vị (lấy khung chữ + điểm dọc theo từng nét).

Chung:

14. Theme sáng/tối dùng token `lib/theme.css`; `npm run verify` xanh.
