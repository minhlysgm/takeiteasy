# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Sửa `npm run lint` (Next 16 bỏ `next lint`) → ESLint CLI + flat config, đưa lint vào `verify`
- **Cỡ:** S
- **Trạm:** ⑦ Nghiệm thu — chờ Minh duyệt
- **Nhánh:** task/eslint-cli (từ main 70f0ca9, chưa push, chưa merge)
- **Minh đã chọn:** tắt luật `react-hooks/set-state-in-effect` kèm lý do trong `eslint.config.mjs`; viết lại 9 chỗ để backlog.
- **Tui tự chọn:** bộ luật core-web-vitals + typescript (mẫu Next khuyên); `--max-warnings=0`; tên bắt đầu bằng `_` được phép không dùng; sửa 4 cảnh báo (postcss config đặt tên, `requestCloseDrawer` bọc useCallback).
- **Bằng chứng:** `npm run verify` exit 0 (lint sạch, unit 158/158, e2e 36/36); gài biến thừa → lint exit 1.

## Backlog

1. **[M · UI] Reader chưa dùng được trên mobile** — lưới 4 cột cố định đẩy cột bản dịch ra ngoài màn hình, nguyên văn bị bóp còn ~10 ký tự/dòng, footer vỡ chữ (xem `npm run ui:snap`).
2. **[S · UI] Nút "N" của Next dev che nút "giải thích"** ở góc dưới trái (chỉ khi dev) — dời `devIndicators` sang góc khác.
3. **[S · UI] Footer màn đọc bị đẩy dưới mép màn hình** — ở 1440×900 khung phác thảo làm trang cao hơn, không thấy trọn footer (đoạn 3 vốn đã tràn).
4. **[S · UI] Chưa có viền focus chung** — các nút dùng viền xanh mặc định của trình duyệt, lạc tông; thêm `focus-visible` theo token cho mọi nút.
5. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
6. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — 9 chỗ: FirstTimeHint, PassageSketch (2), PassageView (2), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.

## Đã xong

- 2026-11-05 · Hình phác thảo tự vẽ minh hoạ mỗi đoạn (cỡ M) — spec `2026-11-05-passage-sketch-design.md`, merge vào main (chưa push)
- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
