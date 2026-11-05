# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

Minh mở **2 task cùng lúc** (2026-11-05). **Bước kế:** trạm ⑥ của A trên nhánh `task/passage-jump` (tạo từ `task/jump-and-lookup-specs`, chưa merge main): chạy `npm run verify`, skill `ui-review`, `/code-review`, gom danh sách cho Minh chọn. A nghiệm thu + merge main xong → B tạo `task/in-app-lookup` từ main. Task 6 của plan B (gắn Anthropic/Vercel/Upstash) làm cùng Minh qua trình duyệt, Minh tự dán key.

Đã làm ①–④ song song (hỏi chung một lượt, spec + mockup riêng), build lần lượt **A trước rồi B**. Mockup chung: `docs/superpowers/specs/2026-11-05-jump-lookup-mockup.html` (artifact https://claude.ai/artifact/6gSVNRTKtsfG2j9WH6gi1Z) (B cần API key, Minh lo trong lúc build A).

- **Task A — Nhảy nhanh tới đoạn bất kỳ** · cỡ **M · UI** · trạm **⑥ Kiểm thử & soi UI — chờ Minh chọn mục sửa** · nhánh `task/passage-jump` (⑤ xong 2026-11-05, HEAD 22f8281) · plan `docs/superpowers/plans/2026-11-05-passage-jump.md` · spec `docs/superpowers/specs/2026-11-05-passage-jump-design.md`
  - ⑤ đã làm: `lib/readPassages.ts` (`tie:read`), `firstSentence` trong `lib/content.ts`, hook `lib/useSheetBehavior.ts` (tách từ ChunkDrawer), `components/reader/PassageJumpList.tsx`, gắn vào ChapterReader/PassageView (phím g/Home/End), token `--accent-soft`. Test: `e2e/passage-jump*.spec.ts`, `tests/passage-jump-list.test.tsx`, `tests/use-sheet-behavior.test.tsx`, `tests/read-passages.test.ts`. Subagent báo `npm run verify` xanh (vitest 254, playwright 160) — ⑥ phải tự chạy lại và dán kết quả.
  - Quyết định tui tự chọn lúc build (báo Minh ở ⑦): câu mở đầu tính ở ChapterReader (client) thay vì server; thêm token `--accent-soft` vì `bg-accent/10` không chạy với màu dạng biến; chọn đoạn / bấm chuột đóng → bỏ focus (Enter vẫn = sang đoạn), đóng bằng g/Esc → focus về bộ đếm; Home ở đoạn 1 / End ở đoạn cuối để trình duyệt cuộn như thường; Tab ra khỏi ô nổi desktop thì ô tự đóng; trả focus không cuộn trang (cả tấm giải thích); bấm bộ đếm khi tấm giải thích đang mở thì đóng tấm (không có hiệu ứng trượt ra).
  - Cần Minh xem ở ⑥ (soi UI): chữ "đang đọc" theme sáng tương phản 3.7:1 (dưới chuẩn 4.5); tiêu đề header mobile đổi sang `text-bright` (trước là muted); ở 320px khi bật giải thích thì ẩn dấu ▾ để vừa chữ "· explain" (dư ~2px); ô nổi desktop đè lên dòng gợi ý lần đầu (FirstTimeHint); header mobile không dính nên phải cuộn lên mới bấm được tiêu đề.
  - **⑥ đã chạy (2026-11-05):** `npm run verify` xanh (vitest 254, playwright 160). Ảnh soi UI + script `snap.cjs` ở scratchpad session cũ (mất khi đổi session — chụp lại nếu cần). **Chờ Minh chọn mục sửa** trong danh sách:
    - Cao: (1) viền focus dòng desktop bị ô cuộn cắt → `focus-visible:outline-offset-[-2px]` mọi cỡ (PassageJumpList.tsx:129); (2) Tab ra khỏi ô nổi → onClose("key") kéo focus về bộ đếm, không Tab ra được (PassageJumpList.tsx:49) → kiểu đóng thứ 3 giữ focus nơi vừa tới; (3) Shift+Home/End đang bôi đen → nhảy đoạn (PassageView.tsx:180 guard thiếu Home/End).
    - Vừa: (4) ô nổi đè FirstTimeHint → ẩn hint khi jumpOpen; (5) "đang đọc" sáng 3.7:1 + số dòng hiện tại 4.0:1 → chữ đậm hơn (`text-ink-strong`/token mới); (6) 320px dòng hiện tại chỉ còn ~9 ký tự → mobile bỏ chữ "đang đọc" (giữ sr-only); (7) header mobile không dính → cần mockup nếu làm; (8) ChunkDrawer đóng bằng Esc không còn cuộn về cụm (hook mới dùng preventScroll); (9) firstSentence cắt sai "Mr.", ngoặc ’ ), dòng trống đầu (lib/content.ts).
    - Thấp: tấm mobile đóng không trượt xuống; ô nổi hiện bụp (fade 150ms); hover dòng mờ; gợi ý phím chân ô xuống 2 dòng; "Chương" hoa vs "chương"; ô nổi neo mép phải chứ không trên bộ đếm; 320px+explain dư 2px; click đầu khi ô nổi mở chỉ để đóng (giữ).
    - Dọn code: Esc xử lý 2 nơi; sửa focus chồng lên hook → cho `useSheetBehavior` tuỳ chọn restoreFocus; readAll lặp logic progress.ts; readSet O(n·m).
    - Cần Minh quyết: spec chốt tính câu mở đầu ở server, đã làm ở client (nội dung đoạn vốn đã xuống client vì màn đọc sống xuyên đoạn) → khuyên giữ client, sửa spec.
  - Vụn vặt có thể để sau: `g` khi chữ dịch còn đang gõ thì chỉ bỏ qua hiệu ứng gõ; Enter trên dòng "đang đọc" đóng danh sách nhưng focus về body (đẹp hơn là về bộ đếm); dòng đầu đoạn rỗng → câu mở đầu rỗng; mỗi dòng là một điểm dừng Tab.
- **Task B — Tra nghĩa ngay trong app (thay Cambridge)** · cỡ **M · UI** · trạm **⑤ Build — chờ A xong** (④ Minh duyệt 2026-11-05) plan `docs/superpowers/plans/2026-11-05-in-app-lookup.md` (5 task code + Task 6 gắn dịch vụ cùng Minh) · spec `docs/superpowers/specs/2026-11-05-in-app-lookup-design.md`
  - Ý: vùng chọn trùng chunk → mở ChunkDrawer; không trùng → API route gọi AI với cụm + câu chứa nó → IPA, nghĩa trong câu, 1 ví dụ đời thường + dịch, 🔊; link "xem thêm ở Cambridge" làm lối thoát.
  - Code: hiện `window.open(lookupUrl)` (SelectionActions.tsx:47, lib/selection.ts). `useTextSelection` chỉ trả `{text, rect}`, bỏ Range → cần giữ offset để lấy câu. Giới hạn ≤5 từ (quá thì ẩn nút). **Chưa có server code nào** (không api route, env, SDK, KV). Test phải sửa: e2e/selection.mobile.spec.ts:59-63, tests/selection-ui.test.tsx:36-40, tests/selection.test.ts:14-15. Giọng đọc en-US → IPA giọng Mỹ.
  - ② Minh chốt: Claude Haiku 5.5 (Minh có key, nạp $10 → khoá tính năng ở $9 để chống spam/hack); ≤10 từ. Minh muốn Claude mở trình duyệt để Minh đăng nhập rồi Claude thao tác (Vercel env, Anthropic Console) — Minh tự dán key.
  - Minh duyệt dùng Upstash Redis (free, Vercel Marketplace) cho bộ đếm $, rate limit, cache.
  - Trước khi plan/build B: load skill `claude-api`.

- **Ghi chú:** push `main` thất bại — máy chưa đăng nhập GitHub cho git (không có `gh`). Minh tự push hoặc đăng nhập rồi bảo Claude push.

## Backlog

1. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
2. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — ~8 chỗ: FirstTimeHint, PassageSketch (2), PassageView (speechOk + `clearSelection()`/`typing.skip()` trong effect đổi đoạn — reset explain/drawer đã chuyển sang lúc vẽ), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn ngay lúc vẽ (như PassageView đã làm) — KHÔNG dùng `key` cho PassageView vì sẽ dựng lại màn đọc, mất vạch tiến độ trượt; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
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
