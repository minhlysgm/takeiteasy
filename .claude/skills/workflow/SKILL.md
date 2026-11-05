---
name: workflow
description: Quy trình làm task của dự án takeiteasy. Dùng MỖI KHI Minh nói "tiếp", "tiếp tục", "làm tiếp", "task tiếp theo (là gì)", "next", "đang tới đâu rồi", "ok"/"duyệt"/"chốt" khi đang có cổng chờ duyệt, "thêm vào backlog …", hoặc khi Minh mô tả một task/tính năng/bug mới.
---

# Workflow takeiteasy

Minh **không cần nhớ cú pháp**. Mọi bước được điều khiển bằng câu nói tự nhiên + file
`docs/workflow/STATE.md`. Bạn tự biết đang ở trạm nào và tự làm trạm đó.

## 0. Luôn làm trước tiên

1. Đọc `docs/workflow/STATE.md` (thường đã có sẵn trong context nhờ hook SessionStart).
2. Xác định ý Minh theo bảng:

| Minh nói | Bạn làm |
|---|---|
| mô tả task mới | Nếu đang có task dở → hỏi: cất task dở vào backlog hay làm task mới sau? Rồi vào **Trạm ①** |
| "tiếp" / "task tiếp theo" / "làm tiếp" | Đang có task → làm trạm hiện tại (hoặc trạm kế nếu cổng đã duyệt). Không có task → đề xuất task đầu backlog, kèm 1 câu lý do, hỏi "làm cái này nhé?" |
| "ok" / "duyệt" / "chốt" | Đánh dấu cổng đã duyệt trong STATE → sang trạm kế |
| "đang tới đâu rồi" | Báo 3 dòng: task, trạm, đang chờ ai làm gì |
| "thêm vào backlog …" | Ghi vào Backlog kèm nhãn cỡ [S/M/L] và [UI] nếu có, không làm gì thêm |

3. **Cập nhật STATE.md** mỗi khi qua cổng, xong một task con, hoặc trước khi đề nghị đổi session.

## Phân cỡ (làm ở Trạm ①, nói rõ cho Minh, Minh có thể đổi)

- **S** — sửa nhỏ, rõ ràng (≤ ~3 file): ① → ② gọn → ⑤ (test trước) → ⑥ → ⑦. Bỏ spec/plan.
- **M** — tính năng vừa: đủ 7 trạm, spec ngắn, plan ngắn.
- **L** — lớn / nhiều phần: đủ 7 trạm; nếu thực ra là nhiều task độc lập → tách vào backlog.

## Các trạm

**① Nhận task** — Đọc code liên quan bằng subagent `Explore` (chỉ nhận kết luận, không đổ file vào context).
Phân cỡ. Ghi Task + Cỡ vào STATE.

**② Làm rõ** — Liệt kê **một lượt** mọi điểm chưa rõ / cần lựa chọn. Dùng `AskUserQuestion`
(≤ 4 câu mỗi lượt), mỗi câu có phương án khuyên đặt đầu với nhãn "(Khuyên dùng)" + lý do ngắn.
Câu nào có sẵn mặc định hợp lý thì không hỏi — ghi là "tui chọn X vì Y". Phản biện như Product Owner
nếu yêu cầu có vấn đề (UX, pháp lý, phạm vi). Ngôn ngữ đời thường, không thuật ngữ quy trình.

**③ Chốt spec** _(cổng: Minh duyệt)_ — Viết `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`:
mục tiêu & lý do, phạm vi / ngoài phạm vi, quyết định đã chốt, **tiêu chí nghiệm thu dạng
"Khi … thì …"** (mỗi tiêu chí sẽ thành một test e2e). Có UI → load skill `artifact-design`, làm
**mockup artifact** để Minh xem trước (tối đa 2–3 phương án nếu thật sự khác nhau, nói rõ cái
khuyên dùng). Duyệt từng phần nếu spec dài. Commit spec.

**④ Plan** _(cổng: Minh duyệt)_ — Dùng `superpowers:writing-plans`. Mỗi task con có test đi kèm;
tiêu chí nghiệm thu → kịch bản trong `e2e/`. Commit plan.
→ Sau khi duyệt: cập nhật STATE, rồi **đề nghị đổi session** (xem mục Context).

**⑤ Build** — Tạo nhánh `task/<slug>` từ `main`. Dùng `superpowers:subagent-driven-development`
(test trước, code sau, mỗi task con một commit). Viết test e2e cho các tiêu chí nghiệm thu.
Cập nhật STATE sau mỗi task con (task nào xong, task nào tiếp).
→ Xong: **đề nghị đổi session**.

**⑥ Kiểm thử & soi** — Chạy `npm run verify` (type-check + unit + e2e) và dán kết quả thật.
Có UI → dùng skill `ui-review`. Rồi chạy `/code-review` (agent mới, không thiên vị code vừa viết).
Gom đề xuất thành 1 danh sách, mỗi mục có mức độ + đề xuất sửa; Minh chọn mục nào làm → sửa → verify lại.

**⑦ Nghiệm thu** _(cổng: Minh duyệt)_ — Báo cáo ngắn: làm được gì, bằng chứng (output test, ảnh
chụp), những quyết định bạn tự chọn. Minh "ok" → merge nhánh vào `main` (hỏi trước khi push),
chuyển task sang "Đã xong" trong STATE, rồi gợi ý task tiếp theo từ backlog.

## Context — giữ session gọn

Bạn không đo được chính xác context đã dùng, nên dùng các mốc sau:

- **Đổi session ở ranh giới trạm:** sau ④ duyệt và sau ⑤ xong. Session dài bất thường (nhiều ảnh
  chụp, nhiều output lớn, đã bị tự nén) → đổi sớm hơn.
- **Trước khi đề nghị đổi:** STATE.md phải đủ để một session mới làm tiếp mà không cần hỏi lại
  (đang ở đâu, đã chốt gì, bước kế là gì, file nào cần đọc).
- **Câu đề nghị luôn cùng một dạng**, đặt cuối tin nhắn:

  > 👉 Đã lưu trạng thái. Gõ `/clear` rồi gõ **tiếp** để sang trạm _<tên trạm kế>_.

  (Dùng ở môi trường không có hook, ví dụ web: gõ **"tiếp — đọc docs/workflow/STATE.md"**.)
- Đọc nhiều file / tìm kiếm rộng → giao subagent. Soi ảnh chụp → giao subagent (xem `ui-review`).

## Không được

- Code trước khi qua cổng ③ (trừ cỡ S).
- Nói "xong" khi chưa chạy `npm run verify` và dán kết quả.
- Push / merge / xoá nhánh khi Minh chưa đồng ý.
- Hỏi Minh câu mà code hoặc STATE đã trả lời được.
