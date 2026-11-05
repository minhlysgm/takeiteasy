# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

**Bước kế:** Task B trạm ⑤ Build — tạo nhánh `task/in-app-lookup` từ `main`, làm theo plan bằng `superpowers:subagent-driven-development` (load skill `claude-api` trước). Task 6 của plan (gắn Anthropic/Vercel/Upstash) làm cùng Minh qua trình duyệt, Minh tự dán key. Mockup chung: `docs/superpowers/specs/2026-11-05-jump-lookup-mockup.html` (artifact https://claude.ai/artifact/6gSVNRTKtsfG2j9WH6gi1Z).

- **Task B — Tra nghĩa ngay trong app (thay Cambridge)** · cỡ **M · UI** · trạm **⑤ Build — LÀM TIẾP Ở ĐÂY** (④ Minh duyệt 2026-11-05) plan `docs/superpowers/plans/2026-11-05-in-app-lookup.md` (5 task code + Task 6 gắn dịch vụ cùng Minh) · spec `docs/superpowers/specs/2026-11-05-in-app-lookup-design.md`
  - Ý: vùng chọn trùng chunk → mở ChunkDrawer; không trùng → API route gọi AI với cụm + câu chứa nó → IPA, nghĩa trong câu, 1 ví dụ đời thường + dịch, 🔊; link "xem thêm ở Cambridge" làm lối thoát.
  - Code: hiện `window.open(lookupUrl)` (SelectionActions.tsx:47, lib/selection.ts). `useTextSelection` chỉ trả `{text, rect}`, bỏ Range → cần giữ offset để lấy câu. Giới hạn ≤5 từ (quá thì ẩn nút). **Chưa có server code nào** (không api route, env, SDK, KV). Test phải sửa: e2e/selection.mobile.spec.ts:59-63, tests/selection-ui.test.tsx:36-40, tests/selection.test.ts:14-15. Giọng đọc en-US → IPA giọng Mỹ.
  - ② Minh chốt: Claude Haiku 5.5 (Minh có key, nạp $10 → khoá tính năng ở $9 để chống spam/hack); ≤10 từ. Minh muốn Claude mở trình duyệt để Minh đăng nhập rồi Claude thao tác (Vercel env, Anthropic Console) — Minh tự dán key.
  - Minh duyệt dùng Upstash Redis (free, Vercel Marketplace) cho bộ đếm $, rate limit, cache.
  - Trước khi plan/build B: load skill `claude-api`.

- **Ghi chú:** push `main` thất bại — máy chưa đăng nhập GitHub cho git (không có `gh`). Minh tự push hoặc đăng nhập rồi bảo Claude push.

## Backlog

0. **[S · UI] Header mobile không dính → phải cuộn lên mới mở được danh sách đoạn** (từ ⑥ task A): cho header mobile dính, hoặc thêm nút "≡ 2/3" ở footer — cần mockup cho Minh chọn trước.
0. **[S · UI] Vụn vặt danh sách đoạn** (từ ⑥ task A, mức thấp): tấm mobile đóng không trượt xuống (ChunkDrawer có `closing`); ô nổi desktop hiện bụp (fade 150ms); hover dòng gần như không thấy; gợi ý phím chân ô xuống 2 dòng; "Chương" hoa vs "chương" thường; ô nổi neo mép phải chứ không trên bộ đếm; 320px + explain chỉ dư 2px (mất ▾); readAll lặp logic `lib/progress.ts`.

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — ~8 chỗ: FirstTimeHint, PassageSketch (2), PassageView (speechOk + `clearSelection()`/`typing.skip()` trong effect đổi đoạn — reset explain/drawer đã chuyển sang lúc vẽ), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn ngay lúc vẽ (như PassageView đã làm) — KHÔNG dùng `key` cho PassageView vì sẽ dựng lại màn đọc, mất vạch tiến độ trượt; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
3. **[S · UI] Vụn vặt của bôi đen** (hoãn sau ⑥, mức thấp): thanh/popup bật ra đột ngột (trượt lên + hiện dần 180ms); popup theme tối viền/bóng mờ khó thấy mép; popup lật xuống dưới chưa chặn mép dưới (câu dài sát đầu trang có thể chui dưới footer); đổi cỡ cửa sổ khi đang chọn thì popup dùng toạ độ cũ; bôi đen trong ~0.35s đầu khi đoạn mới trượt vào thì popup lệch ≤10px; tiêu chí 1 (≤ 0.5s) chỉ dư ~250ms, để ý khi chạy CI; thêm project e2e WebKit (iPhone) cho 2 file selection.

## Đã xong

- 2026-11-05 · Nhảy nhanh tới đoạn bất kỳ: danh sách đoạn (bộ đếm / tiêu đề mobile / phím g), Home/End, ✓ đoạn đã đọc (`tie:read`) (cỡ M · UI) — spec `2026-11-05-passage-jump-design.md`, plan `2026-11-05-passage-jump.md`; ⑥ sửa 9 mục (viền focus, Tab ra ngoài, Shift+Home/End, mẹo lần đầu, tương phản `--accent-strong`, dòng 320px, focus tấm giải thích, câu mở đầu). Quyết định tự chọn: câu mở đầu tính ở trình duyệt; chọn đoạn/bấm chuột đóng → không giữ focus; Home/End ở đầu/cuối chương để trình duyệt cuộn. Test `e2e/passage-jump*.spec.ts`. Merge vào main (chưa push)
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
