# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Hình phác thảo tự vẽ (sketch) minh hoạ đại ý mỗi đoạn — nét vẽ hiện dần, có bút chì chạy theo
- **Cỡ:** M
- **Trạm:** ⑥ Kiểm thử & soi — chưa bắt đầu (⑤ Build xong 2026-11-05)
- **Đang chờ:** Claude làm trạm ⑥: chạy `npm run verify`, skill `ui-review`, `/code-review`, rồi gom một danh sách cho Minh chọn.
- **Nhánh:** task/passage-sketch (chưa push, chưa merge). Commit code cuối: ff5b396. `npm run verify` tại commit đó: exit 0, type-check sạch, unit 144/144, e2e 33/33.
- **Spec:** docs/superpowers/specs/2026-11-05-passage-sketch-design.md (đã sửa tiêu chí 2, thêm tiêu chí 12) · **Plan:** docs/superpowers/plans/2026-11-05-passage-sketch.md (Task 0–6 xong hết)
- **Minh đã duyệt:** ảnh tĩnh hình đoạn 2 và 3. Minh **chưa xem chuyển động** sau khi sửa (nét vẽ tuần tự sau bút chì) — cho xem ở ⑦.
- **Minh đã chọn:** chờ bản dịch gõ xong VÀ hình lọt vào màn hình (≥ 90%) rồi mới vẽ; chưa vẽ xong thì chưa tính là đã xem.

**Đưa vào danh sách ở ⑥ cho Minh chọn (chưa sửa):**
1. Footer bị đẩy xuống dưới mép màn hình: khung phác thảo làm trang cao hơn, ở 1440×900 đoạn 1 và 2 không còn thấy trọn footer (đoạn 3 vốn đã tràn từ trước). Việc này ở màn đọc, không chỉ của hình.
2. Dòng "cuộn xuống để xem vẽ…" vẫn hiện khi người đọc đã cuộn quá hình, lúc đó "xuống" là sai hướng. Sửa nhanh: "cuộn tới hình để xem vẽ…" (1 chuỗi + tiêu chí 12).
3. Bút chì ở vị trí xuất phát đè lên hàng tiêu đề gần nút "xem ngay", và bấm trúng bút chì được tính là bấm vào hình.
4. Bấm chuột vào "giải thích"/theme/ghi chú xong, nút giữ focus nên Enter không sang đoạn nữa (hệ quả của việc sửa Enter trên nút).
5. Sau khi nút "xem ngay" đổi thành "↻ vẽ lại", focus rơi về `<body>` (ảnh hưởng người dùng bàn phím). Sửa: dùng một nút cố định.
6. Vòng khoanh mỏng hơn mockup một chút (2 thay vì 2.2) vì ellipse không có field `width`.

**Lỗi nhỏ đã biết, tui khuyên để nguyên:** ngưỡng 90% không tính lại khi đổi cỡ cửa sổ; `arrowPath` có đầu mũi tên bẹt nếu điểm điều khiển trùng điểm cuối (dữ liệu hiện tại không có); `bukowskiHead` không co nét theo `s` (hiện chưa ai truyền `s`); chưa thử trên Firefox.

## Backlog

1. **[S] `npm run lint` hỏng** — Next 16 đã bỏ `next lint`; chuyển sang ESLint CLI + flat config rồi đưa lint vào `verify`.
2. **[M · UI] Reader chưa dùng được trên mobile** — lưới 4 cột cố định đẩy cột bản dịch ra ngoài màn hình, nguyên văn bị bóp còn ~10 ký tự/dòng, footer vỡ chữ (xem `npm run ui:snap`).
3. **[S · UI] Nút "N" của Next dev che nút "giải thích"** ở góc dưới trái (chỉ khi dev) — dời `devIndicators` sang góc khác.

## Đã xong

- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
