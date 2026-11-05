---
name: ui-review
description: Soi giao diện takeiteasy sau khi code UI — chụp màn hình desktop/mobile × sáng/tối, tìm chỗ chưa đẹp, chưa mượt, rồi đề xuất cải thiện cho Minh chọn. Dùng ở trạm ⑥ của workflow hoặc khi Minh nói "soi UI", "xem giao diện", "UI ổn chưa".
---

# Soi UI

## 1. Chụp

```bash
npm run ui:snap                                   # route mặc định: kệ sách, reader, reader + explain
npm run ui:snap -- / /read/the-subtle-art/ch01/2  # route tuỳ chọn; thêm "#explain" để bật giải thích
```

Ảnh ở `.ui-snaps/<route>__<desktop|mobile>__<dark|light>.png`. Script tự bật dev server nếu chưa chạy.

## 2. Soi — giao cho subagent để khỏi tốn context

Dispatch 1 subagent (`general-purpose`) đọc các ảnh liên quan tới thay đổi + file component +
`lib/theme.css`, chấm theo checklist dưới, trả về **chỉ danh sách phát hiện** (không mô tả lại ảnh).

Checklist:
- **Bố cục:** tràn ngang, bị cắt, chồng lấn, cột bị bóp; mobile 390px dùng được không.
- **Nhịp khoảng cách:** padding/margin đồng đều, căn lề thẳng hàng.
- **Chữ:** thứ bậc tiêu đề/nội dung rõ, độ dài dòng 45–80 ký tự, không vỡ chữ giữa từ.
- **Màu & tương phản:** đọc được ở cả sáng và tối, dùng token trong `lib/theme.css`, không màu lạ.
- **Trạng thái:** hover / focus (bàn phím) / disabled / đang tải / rỗng / nội dung dài.
- **Chuyển động** (ảnh không thấy được → đọc code CSS/animation): 150–300ms cho UI nhỏ, easing
  ease-out, chỉ animate `transform`/`opacity`, có `motion-reduce`. Cần thì quay video bằng
  Playwright (`recordVideo`) để xem.
- **Nhất quán** với phong cách hiện có (terminal mono + chữ tay ghi chú).

## 3. Đề xuất cho Minh

Một bảng: `# | Chỗ | Vấn đề | Đề xuất | Mức (cao/vừa/thấp)`. Sắp theo mức. Ghi rõ mục nào bạn khuyên làm.
Thay đổi nhìn thấy rõ (bố cục, màu, animation mới) → làm **mockup artifact before/after** để Minh xem.
Chỉ sửa những mục Minh chọn; sửa xong chụp lại và so sánh.
