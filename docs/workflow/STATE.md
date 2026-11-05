# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

**Bước kế:** đề xuất làm **Task 6 của plan tra nghĩa — gắn dịch vụ thật** (`docs/superpowers/plans/2026-11-05-in-app-lookup.md` dòng ~238): Anthropic Console (workspace, spend limit $9, key, tắt auto-reload) → Vercel thêm Upstash Redis → Minh dán `ANTHROPIC_API_KEY` + `LOOKUP_BUDGET_USD=9` → deploy lại, thử `lout`/`piled up`/`cheapskate`. Không code; Claude mở trình duyệt, Minh tự đăng nhập & dán key. **Đang làm (2026-11-05):** main đã push. Console: đã tạo workspace `takeiteasy` (wrkspc_01HgcW8CnCsDEhtbT1kdFUFr), trần $9/tháng, auto-reload tắt (lưu ý gói Max tặng $100 credit/tháng → số dư không phải trần). Tiếp: Minh tự tạo key trong workspace đó → Vercel (Upstash + env) → deploy → thử.

- **Ghi chú:** push `main` thất bại — máy chưa đăng nhập GitHub cho git (không có `gh`). Minh tự push hoặc đăng nhập rồi bảo Claude push.

## Backlog

0. **[S] Tra nghĩa: vụn vặt hoãn từ ⑥ task B** — giới hạn lượt dựa IP `x-forwarded-for` (giả được nếu không chạy sau Vercel; đổi sang `x-vercel-forwarded-for`/`x-real-ip`); `sentenceAt` dùng lại `ABBREV` của `lib/content` (Mr./Dr., `."` khi lùi) — nội dung hiện chưa gặp.
0. **[S] Tra nghĩa: chống tiêu cạn $9** (từ soát cuối task B): server tự tính câu chuẩn (tìm chữ tra trong đoạn rồi `sentenceAt`) thay vì tin câu trình duyệt gửi → số khoá cache giới hạn theo nội dung sách; `chunkAt` nhận cả trường hợp chữ khớp `chunk.match` ở chỗ khác trong đoạn (spec ghi "hoặc chữ khớp"); test `upstashStore` bằng client giả; bộ đếm tiền/giới hạn lượt chưa nguyên tử (vượt nhẹ khi nhiều request cùng lúc).
0. **[S · UI] Header mobile không dính → phải cuộn lên mới mở được danh sách đoạn** (từ ⑥ task A): cho header mobile dính, hoặc thêm nút "≡ 2/3" ở footer — cần mockup cho Minh chọn trước.
0. **[S · UI] Vụn vặt danh sách đoạn** (từ ⑥ task A, mức thấp): tấm mobile đóng không trượt xuống (ChunkDrawer có `closing`); ô nổi desktop hiện bụp (fade 150ms); hover dòng gần như không thấy; gợi ý phím chân ô xuống 2 dòng; "Chương" hoa vs "chương" thường; ô nổi neo mép phải chứ không trên bộ đếm; 320px + explain chỉ dư 2px (mất ▾); readAll lặp logic `lib/progress.ts`.

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — ~8 chỗ: FirstTimeHint, PassageSketch (2), PassageView (speechOk + `clearSelection()`/`typing.skip()` trong effect đổi đoạn — reset explain/drawer đã chuyển sang lúc vẽ), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn ngay lúc vẽ (như PassageView đã làm) — KHÔNG dùng `key` cho PassageView vì sẽ dựng lại màn đọc, mất vạch tiến độ trượt; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
3. **[S · UI] Vụn vặt của bôi đen** (hoãn sau ⑥, mức thấp): thanh/popup bật ra đột ngột (trượt lên + hiện dần 180ms); popup theme tối viền/bóng mờ khó thấy mép; popup lật xuống dưới chưa chặn mép dưới (câu dài sát đầu trang có thể chui dưới footer); đổi cỡ cửa sổ khi đang chọn thì popup dùng toạ độ cũ; bôi đen trong ~0.35s đầu khi đoạn mới trượt vào thì popup lệch ≤10px; tiêu chí 1 (≤ 0.5s) chỉ dư ~250ms, để ý khi chạy CI; thêm project e2e WebKit (iPhone) cho 2 file selection.

## Đã xong

- 2026-11-05 · Tra nghĩa ngay trong app thay Cambridge: thẻ trong popup desktop / thanh đáy mobile, Claude Haiku 5.5 qua `/api/lookup`, cache + giới hạn 30 lượt/giờ/IP + trần $9 trên Upstash (cỡ M · UI) — spec `2026-11-05-in-app-lookup-design.md`, plan `2026-11-05-in-app-lookup.md`; ⑥ sửa 16 mục (popup không nhảy, ✕ lên hàng nút, bấm lại = đóng thẻ, Safari cũ, timeout 9s×2/25s, cache không trừ lượt…). Test `e2e/lookup*.spec.ts`, vitest 359 / e2e 184. **Chưa gắn key thật (Task 6), chưa thử máy thật.** Merge vào main (chưa push)
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
