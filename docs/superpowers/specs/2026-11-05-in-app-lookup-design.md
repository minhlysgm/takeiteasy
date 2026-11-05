# Tra nghĩa ngay trong app — spec

- Ngày: 2026-11-05 · Cỡ: M · UI
- Mockup: `2026-11-05-jump-lookup-mockup.html` (artifact https://claude.ai/artifact/6gSVNRTKtsfG2j9WH6gi1Z, chung cho 2 việc)

## Mục tiêu & lý do

Hiện "tra nghĩa" mở tab Cambridge. Bôi đen một cụm (không phải từ đơn) thì Cambridge thường không ra kết quả,
lại phải rời trang. Người dùng chủ yếu là người Việt, cần: **phiên âm, nghĩa tiếng Việt đúng trong câu đang
đọc, một câu ví dụ ngắn** — ngay tại chỗ.

## Phạm vi

1. **Vùng bôi đen trùng một cụm đã soạn sẵn** (nằm trọn trong một cụm được gạch chân, hoặc chữ khớp
   `chunk.match`) → "tra nghĩa" mở **tấm giải thích của cụm đó** (dữ liệu biên tập sẵn, không gọi AI).
2. **Không trùng** → gọi `POST /api/lookup` → Claude Haiku trả về:
   - **dạng gốc** (vd bôi "gambled" → "gamble"), **phiên âm IPA giọng Mỹ** (khớp giọng đọc en-US), **loại**
     (danh từ / động từ / cụm động từ / thành ngữ…);
   - **nghĩa trong câu này** (tiếng Việt, ngắn gọn);
   - **1 câu ví dụ đời thường** + bản dịch.
   Kèm nút `▶` đọc dạng gốc (dùng chức năng đọc đã có) và link nhỏ "xem thêm ở Cambridge ↗".
3. **Chỗ hiện kết quả** (xem mockup):
   - Desktop: popup "nghe · tra nghĩa" **mở rộng thành thẻ** ngay tại vùng chọn.
   - Mobile: thanh dính đáy **mở rộng lên thành thẻ** (cao tối đa ~50% màn hình, cuộn được), có ✕.
   - Đang chờ: khung xương (skeleton); bỏ chọn / bấm ra ngoài / Esc thì đóng.
4. **Giới hạn độ dài: ≤ 10 từ** (Minh chọn ở ②). Quá 10 từ: thay nút "tra nghĩa" bằng chữ mờ
   "dài quá để tra · xem bản dịch bên cạnh" (không ẩn trơn như hiện nay).
5. **Hàng rào chi phí & chống spam** (Minh yêu cầu: nạp $10, tới $9 thì khoá tính năng):
   - **Đếm tiền phía server**: mỗi lượt gọi AI cộng chi phí thật (tính từ số token Anthropic trả về) vào
     bộ đếm chung. Tổng ≥ **$9** (biến môi trường `LOOKUP_BUDGET_USD=9`) → API ngừng gọi AI, trả "tạm ngưng".
   - **Chặn ở phía Anthropic (lưới an toàn thứ 2)**: key nằm trong workspace riêng "takeiteasy" có
     **spend limit** trong Console; **tắt auto-reload** credit. Hết tiền → Anthropic trả lỗi 402 → app xử lý êm.
   - **Giới hạn mỗi người dùng**: tối đa 30 lượt tra / giờ / địa chỉ IP.
   - **Chỉ tra chữ trong sách**: server kiểm câu gửi lên có thật trong đoạn của sách và chữ tra nằm trong
     câu đó; không đúng → từ chối. Người ngoài không lợi dụng API làm "ChatGPT miễn phí" được.
   - **Nhớ kết quả** (cache) theo cặp (chữ tra + câu) 30 ngày: nhiều người tra cùng chỗ chỉ tốn tiền 1 lần.
   - Tạm ngưng / lỗi / quá giới hạn → thẻ hiện "Tạm chưa tra được, thử lại sau" + link Cambridge.
6. **Bảo mật key**: API key chỉ nằm trong biến môi trường server trên Vercel (`ANTHROPIC_API_KEY`),
   không bao giờ xuống trình duyệt, không commit vào git.

## Ngoài phạm vi

- Lưu lịch sử từ đã tra / sổ từ / ôn tập.
- Tra trong bản dịch tiếng Việt, trong tấm giải thích.
- Trang quản trị xem đã tiêu bao nhiêu (xem ở Anthropic Console).
- Đăng nhập người dùng.

## Quyết định đã chốt

- AI: **Claude Haiku 5.5** (`claude-haiku-5-5`, Minh chọn ở ②), mức suy nghĩ thấp, trả JSON theo khuôn.
  Ước tính ~$0.0002 / lượt → $9 ≈ 40.000 lượt.
- Ví dụ do AI viết phải là chuyện đời thường, không lấy ví dụ coding (quy ước dự án) — ghi rõ trong prompt.
- **Nơi lưu bộ đếm tiền, giới hạn lượt và cache: Upstash Redis** (gói miễn phí, gắn qua Vercel Marketplace).
  Lý do: Vercel chạy nhiều máy chủ tạm thời, bộ nhớ trong RAM mất liên tục → không đếm tiền chính xác được.
  _(Cần Minh duyệt: thêm 1 dịch vụ miễn phí, Minh đăng nhập Vercel để tui gắn.)_
- Lúc gắn key: tui mở trình duyệt, Minh đăng nhập; **Minh tự dán key vào ô biến môi trường của Vercel**
  để key không đi qua khung chat.
- Test e2e **không gọi AI thật**: chặn `/api/lookup` bằng dữ liệu giả. Phần server test bằng unit test với
  client Anthropic giả.

## Tiêu chí nghiệm thu (mỗi dòng → một test)

Desktop (1440×900), `/api/lookup` giả lập:

1. Khi bôi đen "lout" (không thuộc cụm soạn sẵn) rồi bấm "tra nghĩa" thì popup mở rộng thành thẻ: có
   khung xương khi chờ, rồi hiện dạng gốc, IPA, loại từ, nghĩa trong câu, 1 ví dụ + bản dịch,
   nút ▶ và link "xem thêm ở Cambridge"; **không mở tab mới**.
2. Khi bôi đen "chronic" (thuộc cụm soạn sẵn) rồi bấm "tra nghĩa" thì mở tấm giải thích của cụm "chronic",
   không gọi `/api/lookup`.
3. Khi bấm ▶ trong thẻ thì máy đọc dạng gốc (giả lập `speechSynthesis`).
4. Khi bôi đen 10 từ thì còn nút "tra nghĩa"; 11 từ thì thay bằng chữ "dài quá để tra · xem bản dịch bên cạnh".
5. Khi API trả "tạm ngưng" hoặc lỗi thì thẻ hiện "Tạm chưa tra được, thử lại sau" + link Cambridge.
6. Khi bấm Esc / bấm ra ngoài thì thẻ đóng.

Mobile (390×844):

7. Khi bôi đen "lout" rồi chạm "tra nghĩa" thì thanh đáy mở rộng thành thẻ kết quả, không che footer,
   có ✕; ở 320px thẻ nằm trọn bề ngang, nút cao ≥ 44px.

Server (unit test, client Anthropic giả):

8. Khi câu gửi lên không có trong đoạn sách, hoặc chữ tra không nằm trong câu, thì trả 400, không gọi AI.
9. Khi bộ đếm đã ≥ $9 thì trả "tạm ngưng", không gọi AI.
10. Khi một IP tra lượt thứ 31 trong 1 giờ thì trả 429, không gọi AI.
11. Khi tra lại đúng cặp (chữ + câu) đã có trong cache thì trả kết quả cũ, không gọi AI, không cộng tiền.
12. Sau mỗi lượt gọi AI, bộ đếm tăng đúng chi phí tính từ số token trả về.
13. Khi Anthropic trả lỗi 402 (hết credit) thì API trả "tạm ngưng" chứ không văng lỗi 500.

**Thử thật (trạm ⑥, Minh)**: trên bản deploy, tra vài cụm thật, xem kết quả có hợp lý; kiểm bộ đếm tiền tăng
trên Upstash và số tiền trên Anthropic Console khớp.
