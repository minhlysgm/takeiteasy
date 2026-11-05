# Bôi đen để nghe / tra nghĩa trên cảm ứng — spec

- Ngày: 2026-11-05 · Cỡ: M · UI
- Mockup: `2026-11-05-touch-selection-mockup.html` (artifact https://claude.ai/artifact/JMHD9gLiYx6Jd58SF1jWNu)

## Mục tiêu & lý do

Trên desktop, bôi đen một cụm trong nguyên văn thì hiện popup "▶ nghe · ⌕ tra nghĩa". Trên điện thoại
tính năng này **không chạy**: `SpeechTooltip` chỉ nghe sự kiện `mouseup`, mà giữ-để-bôi-đen bằng tay
không sinh `mouseup`. Kể cả nếu hiện được, popup đặt phía trên vùng chọn sẽ đụng menu Copy/Tra cứu của
iPhone/Android (menu hệ thống luôn nằm phía trên vùng chọn, không tắt được), và popup không kẹp vào
mép màn hình. Mục tiêu: người học trên điện thoại bôi đen một cụm là nghe được phát âm / mở từ điển.

## Phạm vi

1. **Nhận vùng chọn trên mọi thiết bị** bằng sự kiện `selectionchange` (chờ vùng chọn đứng yên
   ~250ms rồi mới hiện, để khỏi nháy khi đang kéo tay cầm). Desktop vẫn chỉ hiện sau khi thả chuột.
2. **Mobile (dưới 1024px, hoặc máy cảm ứng không chuột): thanh dính đáy** nằm ngay trên footer:
   - dòng 1: chữ đang chọn trong ngoặc kép, dài quá thì cắt bằng "…" (một dòng);
   - dòng 2: nút `▶ nghe` và `⌕ tra nghĩa`, cao ≥ 44px.
   - Hiện khi có vùng chọn trong nguyên văn; ẩn khi bỏ chọn. Chạm vào thanh không làm mất vùng chọn
     và không làm thanh biến mất trước khi nút kịp nhận chạm.
3. **Desktop (từ 1024px, có chuột): popup nổi** như hiện tại (phía trên vùng chọn), thêm: luôn nằm trọn
   trong bề ngang màn hình (kẹp mép trái/phải); sát mép trên thì lật xuống dưới vùng chọn.
4. **Chọn quá 5 từ thì ẩn "tra nghĩa"** (cả mobile và desktop) — từ điển không tra được câu.
5. **Mẹo lần đầu trên mobile** thêm vế bôi đen: `// mẹo: chạm "giải thích" để xem các cụm đáng học,
   giữ tay lên chữ để bôi đen và nghe phát âm`.

## Ngoài phạm vi

- Bôi đen trong bản dịch (tiếng Việt), trong tấm giải thích, trong ghi chú tay — không hiện gì.
- Đổi từ điển (vẫn Cambridge Anh–Anh, tìm theo cụm).
- Tự đọc khi vừa bôi đen (phải chạm "nghe").
- Vuốt xuống để đóng tấm giải thích.

## Quyết định đã chốt

- Mobile dùng **thanh dính đáy**, không dùng popup nổi (Minh chọn ở trạm ②): không bao giờ đụng menu
  hệ thống, ngón cái dễ chạm, không lo tràn mép.
- Ẩn "tra nghĩa" khi > 5 từ (Minh chọn ở trạm ②). Đếm từ theo khoảng trắng.
- "Mobile" = dưới 1024px **hoặc** `pointer: coarse` (iPad ngang ≥ 1024px vẫn dùng thanh đáy, vì menu
  hệ thống của iPad cũng nằm trên vùng chọn).
- Tấm giải thích đang mở thì thanh/popup không hiện.
- Số tròn cạnh cụm vốn không bị bôi đen (đã có test) — chữ gửi đi đọc/tra không dính số.

## Tiêu chí nghiệm thu (mỗi dòng → một test e2e)

Mobile (390×844, cảm ứng; vùng chọn tạo bằng script vì Playwright không giả lập được giữ-để-bôi-đen):

1. Khi bôi đen "chronic gambler" trong nguyên văn thì trong ≤ 0.5s thanh hiện ngay trên footer, chứa
   "chronic gambler", có nút "nghe" và "tra nghĩa"; không có popup nổi.
2. Khi bỏ chọn thì thanh ẩn.
3. Khi chạm "nghe" thì máy đọc đúng "chronic gambler" (giả lập `speechSynthesis`) và vùng chọn + thanh vẫn còn.
4. Khi chạm "tra nghĩa" thì mở trang Cambridge tìm "chronic gambler".
5. Khi bôi đen một câu 6 từ trở lên thì thanh chỉ có "nghe", không có "tra nghĩa".
6. Khi bôi đen chữ trong bản dịch thì không hiện thanh.
7. Ở 320px, thanh nằm trọn bề ngang màn hình, không che nút nào của footer, nút cao ≥ 44px; chữ chọn
   dài thì cắt "…" trên một dòng.
8. Khi tấm giải thích đang mở thì không hiện thanh.
9. Mẹo lần đầu trên mobile có vế "giữ tay lên chữ để bôi đen và nghe phát âm".

Desktop (1440×900, chuột):

10. Khi kéo chuột bôi đen rồi thả thì popup hiện phía trên vùng chọn (như cũ); trong lúc đang kéo thì chưa hiện.
11. Khi bôi đen chữ sát mép trái cột thì popup nằm trọn trong màn hình.
12. Khi bôi đen 6 từ trở lên thì popup chỉ có "nghe".

**Thử trên máy thật (trạm ⑥, Minh):** iPhone Safari — giữ tay lên chữ → kéo tay cầm → thanh hiện, chạm
"nghe" có tiếng, menu Copy/Tra cứu của máy không đè lên thanh.
