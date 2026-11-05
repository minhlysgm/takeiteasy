# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Bôi đen để nghe / tra nghĩa trên cảm ứng (cỡ M · UI) — nhánh `task/touch-selection`
- **Trạm:** ⑤ Build — Task 1–2 xong (209cf3c, c44d619..0376d9b), đang làm Task 3. Sổ theo dõi: `.superpowers/sdd/2026-11-05-touch-selection/progress.md`.
- **Bước kế:** tiếp tục (đọc sổ theo dõi, làm task đầu tiên chưa `complete`) — chạy `superpowers:subagent-driven-development` theo plan `docs/superpowers/plans/2026-11-05-touch-selection.md` (Task 1 → 4). Đọc kèm spec `docs/superpowers/specs/2026-11-05-touch-selection-design.md`. Cập nhật STATE sau mỗi task con.
- **Đã chốt ở ②:** mobile dùng thanh dính đáy (trên footer); ẩn "tra nghĩa" khi > 5 từ.
- **Hiện trạng:** `SpeechTooltip` chỉ nghe `mouseup` → chạm/giữ để bôi đen trên điện thoại không hiện gì; popup đặt phía trên vùng chọn, không kẹp mép màn hình; trên iPhone menu Copy/Tra cứu cũng hiện phía trên vùng chọn → đụng nhau.
- **Ghi chú:** push `main` thất bại — máy chưa đăng nhập GitHub cho git (không có `gh`). Minh tự push hoặc đăng nhập rồi bảo Claude push.

## Backlog

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — 9 chỗ: FirstTimeHint, PassageSketch (2), PassageView (2), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
3. **[M · UI] Bôi đen để nghe / tra nghĩa trên cảm ứng** — `SpeechTooltip` chỉ nghe `mouseup`, không hiện khi bôi đen bằng tay; popup không kẹp vào mép màn hình; đụng menu Copy/Tra cứu của iPhone. Cần thử trên máy thật.

## Đã xong

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
