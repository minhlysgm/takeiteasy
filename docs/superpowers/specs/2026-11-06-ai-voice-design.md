# Giọng đọc AI (ElevenLabs) + chọn giọng — spec

Ngày: 2026-11-06 · Cỡ: M · UI · Nhánh: `task/ai-voice`
Mockup: `2026-11-06-ai-voice-mockup.html` (artifact, link trong STATE)

## Mục tiêu & lý do

Giọng trình duyệt (Web Speech) đọc đều đều như máy và mỗi máy một kiểu (Windows, Android, iPhone khác nhau).
Người học nghe để bắt chước ngữ điệu nên cần một giọng tự nhiên và giống nhau trên mọi máy.
Ta tạo sẵn file audio bằng ElevenLabs (neural TTS) cho **đoạn mô tả** và **câu ví dụ**, rồi cho người đọc
chọn 1 trong 5 giọng.

## Phạm vi

### A. Audio tạo sẵn
- Đọc bằng file audio: **đoạn mô tả** của mỗi thẻ ("đọc to" / phím `s`) và **câu ví dụ** trong drawer (▶).
- Mỗi câu có đủ 5 giọng: **Will** (mặc định), Brian, Adam, Sarah, Jessica. Model `eleven_multilingual_v2`,
  tốc độ mặc định 1.0. Voice id ghi trong STATE.
- Mỗi giọng có 1 **câu nghe thử** ngắn, đời thường, có tên giọng, ví dụ: _"Hi, I'm Will. Let's read this one together."_
- File nằm ở `public/audio/<giọng>/<mã>.mp3`, commit chung repo. `<mã>` tính từ nội dung câu + giọng + model
  → sửa câu thì tự ra file mới, file cũ thành thừa.
- Lệnh tạo audio chạy tay (`npm run audio`), đọc key từ `.env.local`, bỏ qua file đã có, báo file thừa (`--prune` thì xoá).
  Không bao giờ in key.
- Unit test **đỏ** nếu có đoạn mô tả / câu ví dụ / câu nghe thử thiếu file của giọng nào, và chỉ rõ câu nào.

### B. Phát / dừng
- Bấm "đọc to" (hoặc `s`) → phát đoạn mô tả bằng giọng đang chọn. Đang phát thì nút thành **"■ dừng"**
  (viền + chữ màu ink như nút đang bật); bấm lại (hoặc `s`) = dừng. Phát hết → nút về "đọc to".
- ▶ câu ví dụ trong drawer: đang phát thành **■**, bấm lại = dừng.
- **Chỉ một thứ phát cùng lúc.** Bắt đầu phát cái mới (đọc to, ví dụ, "nghe" chữ bôi đen, ▶ từ tra, nghe thử)
  → cái cũ dừng, nút cũ về trạng thái thường.
- Chuyển thẻ, rời màn đọc, đổi giọng → dừng. Đóng drawer → dừng câu ví dụ đang phát.
- Hình chưa vẽ xong mà bấm "đọc to" → hiện đủ ngay rồi đọc (như hiện nay).

### C. Chọn giọng
- **Mobile:** nút loa ở ô trống bên trái header (đang để trống cho cân với nút theme), mở tấm từ dưới lên
  (cùng kiểu danh sách thẻ).
- **Desktop:** nút "giọng: Will ▾" ở **bên phải header** (khuyên dùng — xem mockup, phương án B là ở footer), phím `v`,
  mở ô nổi ngay dưới nút.
- Danh sách 5 giọng, mỗi dòng: tên + mô tả ngắn tiếng Việt (vd. "nam · thoải mái") + nút **▶ nghe thử**.
  Bấm dòng = chọn (✓ chuyển sang, ô vẫn mở để so tiếp); ▶ nghe thử = phát câu mẫu, **không** đổi giọng đang chọn.
- Nhớ lựa chọn ở `localStorage` `tie:voice`; giá trị lạ / chưa có → Will.
- Đóng bằng ✕, Esc, bấm ra ngoài; focus trả về nút mở. Dòng là nhóm radio (lên/xuống để chuyển), vùng chạm ≥ 44px.
- Nhãn trợ năng của nút mở: "giọng đọc: Will".

### D. Dự phòng
- File không tải được / không phát được → đọc bằng **giọng trình duyệt** cho lần đó, nút vẫn có "■ dừng" và tự về khi đọc xong.
- Trình duyệt không có Web Speech nhưng phát được audio → "đọc to" và ▶ ví dụ vẫn bấm được.
- Chữ bôi đen ("nghe") và ▶ từ tra **giữ giọng trình duyệt**.

## Ngoài phạm vi (đã có trong backlog "Giọng đọc: phần hoãn")
Tô chữ đang đọc, chỉnh tốc độ, giọng AI cho chữ bôi đen / từ tra, đọc bản dịch tiếng Việt.

## Chi phí & bản quyền
- Hiện có 3 thẻ: 1.854 ký tự (mô tả 899 + 24 câu ví dụ 955) × 5 giọng ≈ **9.300 credit** + câu nghe thử ≈ 250.
- Mỗi thẻ mới ≈ 620 ký tự × 5 ≈ **3.100 credit** → gói Starter (30k/tháng) đủ cho ~9 thẻ/tháng.
- **Minh đăng ký Starter ngay trước khi chạy `npm run audio` chính thức ở ⑤** (file tạo lúc đang trả phí được dùng
  thương mại mãi mãi, không cần ghi "elevenlabs.io"). Trong lúc code, test dùng file giả, không gọi API.

## Quyết định đã chốt
- ElevenLabs `eleven_multilingual_v2`, mặc định Will, 5 giọng (② — Minh nghe 10 mẫu).
- Bấm lại khi đang phát = dừng; nút "■ dừng" (②).
- Audio commit trong `public/audio/`, tạo bằng lệnh chạy tay, bỏ qua câu đã có; thiếu audio → test đỏ; lỗi → giọng trình duyệt (Claude chọn ở ②, Minh không phản đối).
- Claude chọn ở ③: câu nghe thử riêng cho mỗi giọng; bấm dòng = chọn, ▶ = nghe thử; đổi giọng thì dừng; phím `v`; đóng drawer thì dừng ví dụ.

## Tiêu chí nghiệm thu (mỗi dòng → một test e2e)
1. Khi bấm "đọc to" thì phát file audio đoạn mô tả của giọng Will, nút thành "■ dừng".
2. Khi đang phát mà bấm "■ dừng" hoặc phím `s` thì audio dừng, nút về "đọc to".
3. Khi audio phát hết thì nút về "đọc to".
4. Khi bấm ▶ một câu ví dụ trong drawer thì phát file của câu đó, ▶ thành ■; bấm lại thì dừng.
5. Khi đang đọc đoạn mô tả mà bấm ▶ câu ví dụ thì đoạn mô tả dừng (nút về "đọc to") và câu ví dụ phát.
6. Khi đang phát mà chuyển thẻ thì audio dừng.
7. Khi đóng drawer lúc câu ví dụ đang phát thì audio dừng.
8. Khi bấm nút chọn giọng (mobile: loa trái header; desktop: "giọng: Will ▾" hoặc phím `v`) thì thấy 5 giọng, Will có ✓.
9. Khi chọn Sarah rồi bấm "đọc to" thì phát file của Sarah; tải lại trang thì vẫn là Sarah.
10. Khi bấm "▶ nghe thử" cạnh Brian thì phát câu mẫu của Brian và giọng đang chọn không đổi.
11. Khi đổi giọng lúc đang phát thì audio dừng.
12. Khi chỗ chọn giọng đang mở mà bấm Esc / ✕ / ra ngoài thì nó đóng và focus về nút mở.
13. Khi file audio lỗi (404) thì đọc bằng giọng trình duyệt và nút vẫn có "■ dừng".
14. Khi `localStorage` `tie:voice` có giá trị lạ thì dùng Will.
15. (unit) Khi một đoạn mô tả / câu ví dụ / câu nghe thử thiếu file của bất kỳ giọng nào thì test đỏ, nêu tên câu.
