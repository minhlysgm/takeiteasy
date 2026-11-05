# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** _(trống)_
- **Cỡ:** —
- **Trạm:** —
- **Đang chờ:** Minh mô tả task mới, hoặc gõ "tiếp" để lấy task đầu backlog
- **Spec:** — · **Plan:** — · **Nhánh:** —
- **Quyết định đã chốt (chưa nằm trong spec):** —

## Backlog

1. **[S] `npm run verify` đang đỏ vì lỗi type có sẵn** — `tests/annotation-layer.test.tsx:10` (TS2556, spread argument).
2. **[S] `npm run lint` hỏng** — Next 16 đã bỏ `next lint`; chuyển sang ESLint CLI + flat config rồi đưa lint vào `verify`.
3. **[M · UI] Reader chưa dùng được trên mobile** — lưới 4 cột cố định đẩy cột bản dịch ra ngoài màn hình, nguyên văn bị bóp còn ~10 ký tự/dòng, footer vỡ chữ (xem `npm run ui:snap`).
4. **[S · UI] Nút "N" của Next dev che nút "giải thích"** ở góc dưới trái (chỉ khi dev) — dời `devIndicators` sang góc khác.

## Đã xong

- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
