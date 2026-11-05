# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Bôi đen để nghe / tra nghĩa trên cảm ứng (cỡ M · UI) — nhánh `task/touch-selection`
- **Trạm:** ⑥ xong phần sửa — Minh chọn "theo khuyên": sửa 11 mục (mẹo tạm ẩn khi có thanh; thanh tự cuộn vùng chọn lên trên; mở tấm giải thích thì bỏ vùng chọn; chạm thanh nhận qua `data-selection-ui` thay vì dựa thứ tự listener; reset cờ giữ chuột khi rời cửa sổ; chữ nút thanh 13.5px; giữ dấu ngoặc khi cắt chữ; nền khối dính đáy; đệm đều; hover popup; dọn code). `npm run verify` xanh: 217 unit, 132 e2e. Commit `ee40507`.
- **Bước kế:** so ảnh trước/sau (đang chạy) → báo Minh → ⑦ nghiệm thu. **Còn chờ Minh thử máy thật:** iPhone Safari (giữ tay → kéo tay cầm → thanh hiện, chạm "nghe" 2 lần có tiếng, menu Copy/Tra cứu không đè thanh; thanh tự cuộn có làm mất tay cầm không) + Android Chrome ("Touch to Search" có đè thanh không).
- **Quyết định Claude tự chọn ở ⑤ (Minh xem lại ở ⑦):** e2e tiêu chí 1–8 chạy khi mẹo lần đầu đã tắt (tiêu chí 9 test mẹo riêng); xoá test cũ "mẹo không nhắc tô đen" ở `e2e/mobile.spec.ts`; chạm vào chỗ trống của thanh/popup cũng không làm mất vùng chọn; Esc khi tấm giải thích đang mở chỉ đóng tấm (thanh hiện lại sau đó) — ở ⑥ đổi: mở tấm bằng cách bấm cụm thì bỏ luôn vùng chọn; tiêu chí 11 (sát mép trái) ở layout desktop thật không bao giờ chạm mép — phần kẹp mép được unit test lo.
- **Đã chốt ở ②:** mobile dùng thanh dính đáy (trên footer); ẩn "tra nghĩa" khi > 5 từ.
- **Ghi chú:** push `main` thất bại — máy chưa đăng nhập GitHub cho git (không có `gh`). Minh tự push hoặc đăng nhập rồi bảo Claude push.

## Backlog

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — 10 chỗ: FirstTimeHint, PassageSketch (2), PassageView (3, gồm `clearSelection()` trong effect đổi đoạn), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
3. **[S · UI] Vụn vặt của bôi đen** (hoãn sau ⑥, mức thấp): thanh/popup bật ra đột ngột (trượt lên + hiện dần 180ms); popup theme tối viền/bóng mờ khó thấy mép; popup lật xuống dưới chưa chặn mép dưới (câu dài sát đầu trang có thể chui dưới footer); đổi cỡ cửa sổ khi đang chọn thì popup dùng toạ độ cũ; bôi đen trong ~0.35s đầu khi đoạn mới trượt vào thì popup lệch ≤10px; tiêu chí 1 (≤ 0.5s) chỉ dư ~250ms, để ý khi chạy CI; thêm project e2e WebKit (iPhone) cho 2 file selection.
4. **[S] Next remount cả `PassageView` khi chuyển đoạn** — trái với chú thích "không remount" ở `app/read/.../page.tsx` và `PassageView`; có thể làm vạch tiến độ footer không chạy hiệu ứng giữa các đoạn. Kiểm rồi sửa code hoặc sửa chú thích.

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
