# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Lặt vặt tấm giải thích mobile + footer tràn 320px (cỡ S · UI) — nhánh `task/mobile-sheet-polish`
- **Trạm:** ② Làm rõ — chờ Minh chọn bố cục footer (mockup https://claude.ai/artifact/AYwuw4vQzreVzRF4pcVseY: A theme lên header (khuyên) / B + đọc to thành icon loa / C giữ hết, lùi/tiếp chỉ mũi tên) và thanh kéo (bỏ (khuyên) / làm vuốt xuống để đóng / chỉ làm rõ).
- **Tự chọn:** ✕ 19px màu text; bớt hở dưới "// chunk i/n"; dải mờ đáy vùng cuộn khi còn nội dung (ẩn khi cuộn tới cuối); vạch tiến độ mobile `scaleX` 300ms ease-out; vùng mờ thêm `ease-out`; "←" footer ≥44px, cách "tiếp" 8px.
- **Đo được:** footer 320px cần 337px (giải thích 96, đọc to 65, theme 34, ← 36, tiếp 74).

## Backlog

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — 9 chỗ: FirstTimeHint, PassageSketch (2), PassageView (2), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
3. **[M · UI] Bôi đen để nghe / tra nghĩa trên cảm ứng** — `SpeechTooltip` chỉ nghe `mouseup`, không hiện khi bôi đen bằng tay; popup không kẹp vào mép màn hình; đụng menu Copy/Tra cứu của iPhone. Cần thử trên máy thật.
4. **[S · UI] Lặt vặt tấm giải thích mobile** — ✕ nhỏ/nhạt (13px), khoảng trống thừa dưới "// chunk i/n", thanh kéo gần vô hình (`bg-line`), nút "←" footer hẹp 36px và sát "tiếp", màn thấp không có dải mờ báo còn nội dung, vạch tiến độ mobile animate `width` 500ms (nên `scaleX` 300ms ease-out), vùng mờ thiếu `ease-out`; footer tràn ở 320px (rộng 337px → trang cuộn ngang, nút footer bị đẩy dưới mép màn hình).
5. **[S] Dọn code reader** — số thứ tự cụm tính ở 3 nơi (OriginalText/MobileNoteList/ChunkDrawer) → tính một lần; class nút footer lặp 5 lần → `FooterButton`; chuỗi breakpoint `(max-width: 1023.98px)` → hằng số chung; AnnotationLayer chỉ cần tính ghi chú/mũi tên trên desktop (gạch chân thì vẫn cần trên mobile).

## Đã xong

- 2026-11-05 · Viền focus bàn phím chung, token `--focus` (tối xanh accent, sáng gần đen) + sửa 9 mục soi UI (viền ✕/▶ mobile, hình phác thảo rõ lại khi focus, kệ sách mobile hết tràn ngang…) (cỡ S · UI) — test `e2e/focus-ring.spec.ts`, `theme-contrast.test.ts`. Merge vào main (chưa push)
- 2026-11-05 · Desktop: header + footer dính, ngăn giải thích nằm giữa (cỡ S · UI) — test `e2e/desktop-bars.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Dời nút "N" của Next dev sang góc trên phải (cỡ S · UI) — test `e2e/dev-indicator.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Chữ xám `--muted` theme sáng đủ tương phản 4.6:1 (cỡ S · UI) — test `theme-contrast.test.ts`. Merge vào main (chưa push)
- 2026-11-05 · Reader dùng được trên mobile (cỡ M · UI) — spec `2026-11-05-reader-mobile-design.md`, plan `2026-11-05-reader-mobile.md`; ⑥ sửa gói A–G (số tròn liền cụm, bản dịch rõ, khoá cuộn theo breakpoint, giữ Tab trong tấm, vùng chạm 44px, cột tablet). Merge vào main (chưa push)
- 2026-11-05 · Sửa `npm run lint` (ESLint CLI + flat config), lint vào `verify` (cỡ S) — merge vào main (chưa push)
- 2026-11-05 · Hình phác thảo tự vẽ minh hoạ mỗi đoạn (cỡ M) — spec `2026-11-05-passage-sketch-design.md`, merge vào main (chưa push)
- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
