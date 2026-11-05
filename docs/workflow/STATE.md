# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

**Task:** Footer màn đọc bị đẩy dưới mép màn hình ở desktop (backlog 1) · **Cỡ:** S · UI · **Trạm:** ⑦ Nghiệm thu — chờ Minh duyệt.
Minh chọn ở ②: footer dính đáy (không làm "vừa khít màn hình", không thu hình). Tui tự chọn thêm: header cũng dính trên desktop; ngăn giải thích desktop `fixed` giữa header (top-11) và footer (bottom-14); footer/header z-15 trên vùng mờ (z-10) nên vẫn bấm được khi ngăn mở.
Nhánh `task/desktop-footer`. Test `e2e/desktop-bars.spec.ts` (1440×900, 1280×800; đầu/cuối trang; có ngăn mở). Verify xanh: vitest 172 · playwright 88.
Bước kế: Minh "ok" → merge vào main (chưa push), bỏ mục 1 khỏi backlog, ghi "Đã xong".

## Backlog

1. **[S · UI] Footer màn đọc bị đẩy dưới mép màn hình** — ở 1440×900 khung phác thảo làm trang cao hơn, không thấy trọn footer (đoạn 3 vốn đã tràn).
2. **[S · UI] Chưa có viền focus chung** — các nút dùng viền xanh mặc định của trình duyệt, lạc tông; thêm `focus-visible` theo token cho mọi nút.
3. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
4. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — 9 chỗ: FirstTimeHint, PassageSketch (2), PassageView (2), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
5. **[M · UI] Bôi đen để nghe / tra nghĩa trên cảm ứng** — `SpeechTooltip` chỉ nghe `mouseup`, không hiện khi bôi đen bằng tay; popup không kẹp vào mép màn hình; đụng menu Copy/Tra cứu của iPhone. Cần thử trên máy thật.
6. **[S · UI] Lặt vặt tấm giải thích mobile** — ✕ nhỏ/nhạt (13px), khoảng trống thừa dưới "// chunk i/n", thanh kéo gần vô hình (`bg-line`), nút "←" footer hẹp 36px và sát "tiếp", màn thấp không có dải mờ báo còn nội dung, vạch tiến độ mobile animate `width` 500ms (nên `scaleX` 300ms ease-out), vùng mờ thiếu `ease-out`; footer tràn ở 320px (rộng 337px → trang cuộn ngang, nút footer bị đẩy dưới mép màn hình).
7. **[S] Dọn code reader** — số thứ tự cụm tính ở 3 nơi (OriginalText/MobileNoteList/ChunkDrawer) → tính một lần; class nút footer lặp 5 lần → `FooterButton`; chuỗi breakpoint `(max-width: 1023.98px)` → hằng số chung; AnnotationLayer chỉ cần tính ghi chú/mũi tên trên desktop (gạch chân thì vẫn cần trên mobile).

## Đã xong

- 2026-11-05 · Dời nút "N" của Next dev sang góc trên phải (cỡ S · UI) — test `e2e/dev-indicator.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Chữ xám `--muted` theme sáng đủ tương phản 4.6:1 (cỡ S · UI) — test `theme-contrast.test.ts`. Merge vào main (chưa push)
- 2026-11-05 · Reader dùng được trên mobile (cỡ M · UI) — spec `2026-11-05-reader-mobile-design.md`, plan `2026-11-05-reader-mobile.md`; ⑥ sửa gói A–G (số tròn liền cụm, bản dịch rõ, khoá cuộn theo breakpoint, giữ Tab trong tấm, vùng chạm 44px, cột tablet). Merge vào main (chưa push)
- 2026-11-05 · Sửa `npm run lint` (ESLint CLI + flat config), lint vào `verify` (cỡ S) — merge vào main (chưa push)
- 2026-11-05 · Hình phác thảo tự vẽ minh hoạ mỗi đoạn (cỡ M) — spec `2026-11-05-passage-sketch-design.md`, merge vào main (chưa push)
- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
