# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

_(trống — chờ chọn task từ backlog)_

- **Ghi chú:** push `main` thất bại — máy chưa đăng nhập GitHub cho git (không có `gh`). Minh tự push hoặc đăng nhập rồi bảo Claude push.

## Backlog

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — ~8 chỗ: FirstTimeHint, PassageSketch (2), PassageView (speechOk + `clearSelection()`/`typing.skip()` trong effect đổi đoạn — reset explain/drawer đã chuyển sang lúc vẽ), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
3. **[S · UI] Vụn vặt của bôi đen** (hoãn sau ⑥, mức thấp): thanh/popup bật ra đột ngột (trượt lên + hiện dần 180ms); popup theme tối viền/bóng mờ khó thấy mép; popup lật xuống dưới chưa chặn mép dưới (câu dài sát đầu trang có thể chui dưới footer); đổi cỡ cửa sổ khi đang chọn thì popup dùng toạ độ cũ; bôi đen trong ~0.35s đầu khi đoạn mới trượt vào thì popup lệch ≤10px; tiêu chí 1 (≤ 0.5s) chỉ dư ~250ms, để ý khi chạy CI; thêm project e2e WebKit (iPhone) cho 2 file selection.

## Đã xong

- 2026-11-05 · Màn đọc sống xuyên các đoạn: dời lên layout của chương, vạch tiến độ trượt, state đoạn reset lúc vẽ, cuộn lên đầu khi chuyển bằng nút/phím (cỡ S) — test `e2e/passage-persist*.spec.ts`, `tests/passage-switch.test.tsx`. Merge vào main (chưa push)
- 2026-11-05 · Bôi đen để nghe / tra nghĩa trên cảm ứng (cỡ M · UI) — spec `2026-11-05-touch-selection-design.md`; desktop popup, mobile thanh dính đáy; ⑥ sửa 11 mục (mẹo nhường chỗ thanh, tự cuộn vùng chọn, bỏ chọn khi mở tấm…). **Chưa thử máy thật** iPhone Safari / Android Chrome — test `e2e/selection*.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Dọn code reader: `FooterButton`, `lib/breakpoints.ts` (`MOBILE_QUERY`), AnnotationLayer bỏ đo ghi chú lề trên mobile, test chốt số thứ tự cụm khớp 3 nơi (cỡ S) — test `e2e/chunk-numbers.mobile.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Footer mobile vừa 320px (nút theme lên header mobile) + tấm giải thích mobile: bỏ thanh kéo, ✕ to rõ, gọn khoảng hở, dải mờ đáy, vạch tiến độ scaleX 300ms, vùng mờ ease-out; nút N của Next sang top-left (cỡ S · UI) — test `e2e/footer-sheet.mobile.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Viền focus bàn phím chung, token `--focus` (tối xanh accent, sáng gần đen) + sửa 9 mục soi UI (viền ✕/▶ mobile, hình phác thảo rõ lại khi focus, kệ sách mobile hết tràn ngang…) (cỡ S · UI) — test `e2e/focus-ring.spec.ts`, `theme-contrast.test.ts`. Merge vào main (chưa push)
- 2026-11-05 · Desktop: header + footer dính, ngăn giải thích nằm giữa (cỡ S · UI) — test `e2e/desktop-bars.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Dời nút "N" của Next dev sang góc trên phải (cỡ S · UI) — test `e2e/dev-indicator.spec.ts`. Merge vào main (chưa push)
- 2026-11-05 · Chữ xám `--muted` theme sáng đủ tương phản 4.6:1 (cỡ S · UI) — test `theme-contrast.test.ts`. Merge vào main (chưa push)
- 2026-11-05 · Reader dùng được trên mobile (cỡ M · UI) — spec `2026-11-05-reader-mobile-design.md`, plan `2026-11-05-reader-mobile.md`; ⑥ sửa gói A–G (số tròn liền cụm, bản dịch rõ, khoá cuộn theo breakpoint, giữ Tab trong tấm, vùng chạm 44px, cột tablet). Merge vào main (chưa push)
- 2026-11-05 · Sửa `npm run lint` (ESLint CLI + flat config), lint vào `verify` (cỡ S) — merge vào main (chưa push)
- 2026-11-05 · Hình phác thảo tự vẽ minh hoạ mỗi đoạn (cỡ M) — spec `2026-11-05-passage-sketch-design.md`, merge vào main (chưa push)
- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
