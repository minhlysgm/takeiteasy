# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

**Task:** Reader dùng được trên mobile · **Cỡ:** M · UI · **Trạm:** ⑦ Nghiệm thu — **chờ Minh duyệt** (⑥ xong 2026-11-05).

Trạm ⑥ (2026-11-05): verify lần đầu xanh (vitest 166, playwright 62) → soi UI + code review → Minh chọn gói A–G, sửa ở commit e1ccb45 (HEAD) → verify lại xanh: tsc ✓ · eslint ✓ · vitest 166/166 · playwright 75/75 (thêm 13 test mobile). Minh chốt: màu `--muted` theme sáng để task riêng (backlog 7); tấm giữ 85%.
Bước kế (trạm ⑦): Minh "ok" → merge `task/reader-mobile` vào `main` (hỏi trước khi push), chuyển task sang "Đã xong", gợi ý task tiếp.

Tiến độ build: Task 1–5 ✅ · review toàn nhánh (opus) ✅ · 1 lượt sửa sau review ✅ (commit 608ae6c, 89e1bf1).

Tui tự quyết ở ⑥ (báo Minh ở ⑦):
- Số tròn ①②③ trong nguyên văn đổi từ nút thành phần tử nằm trong dòng chữ, con số vẽ bằng CSS → không ngắt dòng giữa cụm/số/dấu câu, bôi đen không dính số. Trình đọc màn hình và phím Tab dùng danh sách ghi chú bên dưới (vẫn là nút).
- Giữ Tab trong tấm + aria-modal chỉ trên mobile (desktop: footer vẫn thấy và bấm được, không phải modal).
- KHÔNG làm đề xuất "bỏ mount AnnotationLayer trên mobile" của code review: chính nó vẽ gạch chân tay trên mobile.
- Footer tràn ở 320px (spec cam kết từ 360px) — chưa sửa.

Tui tự quyết khi build (báo Minh ở ⑦):
- Test "chuyển đoạn khi tấm đang mở" đổi từ tải lại trang sang chuyển đoạn phía client (bấm "← trước" rồi Back) — vì tải lại trang thì test luôn qua, không kiểm được gì.
- Màn hẹp (<1024px) dùng chuột cũng ẩn gợi ý phím ở footer (không chỉ máy cảm ứng) — để chữ nút không xuống dòng ở 360px. Tên nút trên mobile mất chữ phím (vd "giải thích" thay vì "e giải thích"); desktop giữ nguyên.
- Desktop: cụm có nội dung dài thì phần nội dung cuộn bên trong ngăn kéo, hàng nút ← chunk trước / chunk sau → luôn ghim đáy (trước đây cả ngăn cuộn).
- Nút "nghe" trong tấm: vùng chạm 44px bằng padding âm, nhưng bên phải bị khối chữ cạnh đè ~8px (thực ~36px) — mức thấp, chưa sửa.

Còn để lại (mức thấp, cho ⑥ cân nhắc): khoá cuộn chỉ quyết lúc mở tấm (xoay tablet qua 1024px khi đang mở thì không đổi); số ①②③ cạnh cụm vùng chạm ~38px và có thể bị bôi đen dính vào; test sticky footer không kiểm trang đã cuộn thật; dòng trống thừa trong `e2e/mobile.spec.ts`; `shrink-0` thừa ở footer.

Ghi chú trạm ① (đọc code):
- Toàn bộ layout ở `components/reader/PassageView.tsx`: lưới `grid-cols-[200px_1fr_200px_1fr]` (dòng ~150) = lề trái (ghi chú) · nguyên văn (+ hình phác thảo) · lề phải (ghi chú, có viền chia) · bản dịch. Không có breakpoint nào trong reader.
- Ghi chú tay (`AnnotationLayer.tsx`) định vị tuyệt đối bằng JS theo hình học 2 lề 200px (noteX 16, mũi tên 16+172, colRight+16, note w-170px); chỉ tính lại khi resize → không xếp chồng được, mobile cần cách hiển thị khác.
- `ChunkDrawer.tsx`: ngăn kéo bên phải `absolute w-[500px]`, không phải `fixed`; Esc/j/k xử lý trong PassageView.
- Footer (PassageView ~202-263): `h-14` không xuống dòng — 4 nút có `<kbd>` (e/s/t/enter) · thanh tiến độ w-44 · "chương · i/n" + ← trước / tiếp →. "Tiếp" bị lặp 2 lần. FirstTimeHint là dải phía trên footer.
- Bỏ qua hiệu ứng gõ chữ: chỉ bằng phím hoặc bấm cột bản dịch (đang nằm ngoài màn hình).
- `SpeechTooltip` chỉ nghe `mouseup` → bôi đen trên cảm ứng gần như không hiện popup; không kẹp vào mép màn hình.

Đã chốt ở trạm ② (2026-11-05):
- Dưới 1024px dùng bố cục mobile; desktop giữ nguyên.
- Nguyên văn và bản dịch **xếp chồng** (nguyên văn + hình phác thảo ở trên, bản dịch + ý chính ở dưới).
- Ghi chú tay: **số nhỏ ①②③ cạnh cụm gạch chân** + danh sách ghi chú tay cùng số ngay dưới nguyên văn; chạm số/ghi chú → mở giải thích.
- Giải thích: **tấm trượt từ dưới lên** (~85% chiều cao), chạm vùng mờ / ✕ để đóng, có ‹ › sang cụm khác.
- Bôi đen để nghe/tra nghĩa trên cảm ứng → **để task sau** (đã ghi backlog).
- Tui tự chọn: ẩn gợi ý phím trên máy cảm ứng; bỏ nút "enter đoạn tiếp" trên mobile (trùng "tiếp →"); footer gọn, dính đáy màn hình trên mobile.
- Test: `e2e/reader.spec.ts`, `e2e/sketch.spec.ts` (có nhóm `mobile 390px` ~dòng 487). Playwright chỉ có project desktop 1440×900. `ui:snap` có sẵn mobile 390×844.

## Backlog

1. **[S · UI] Nút "N" của Next dev che nút "giải thích"** ở góc dưới trái (chỉ khi dev) — dời `devIndicators` sang góc khác.
2. **[S · UI] Footer màn đọc bị đẩy dưới mép màn hình** — ở 1440×900 khung phác thảo làm trang cao hơn, không thấy trọn footer (đoạn 3 vốn đã tràn).
3. **[S · UI] Chưa có viền focus chung** — các nút dùng viền xanh mặc định của trình duyệt, lạc tông; thêm `focus-visible` theo token cho mọi nút.
4. **[S · UI] Vụn vặt của hình phác thảo** (còn lại sau ⑥, đều mức thấp): bút chì "nhảy cóc" 100–150px giữa các đoạn con của một nét; "↻" "⏭" rơi sang font dự phòng (Safari có thể ra emoji, chưa kiểm); làm tròn số chỉ giảm chứ chưa triệt hẳn lỗi lệch hình giữa server và trình duyệt (hydration), hướng triệt là tính sẵn path vào content; chưa thử trên Firefox/Safari; ngưỡng 90% không tính lại khi đổi cỡ cửa sổ.
5. **[M] Bỏ setState trong effect (luật React 19 `set-state-in-effect`, đang tắt)** — 9 chỗ: FirstTimeHint, PassageSketch (2), PassageView (2), BookShelf, useTheme, useTypingText. Đọc localStorage/theme/speech bằng `useSyncExternalStore`, reset khi chuyển đoạn bằng `key`; xong thì bật lại luật trong `eslint.config.mjs`. Coi chừng lệch hình giữa server và trình duyệt.
6. **[M · UI] Bôi đen để nghe / tra nghĩa trên cảm ứng** — `SpeechTooltip` chỉ nghe `mouseup`, không hiện khi bôi đen bằng tay; popup không kẹp vào mép màn hình; đụng menu Copy/Tra cứu của iPhone. Cần thử trên máy thật.

7. **[S · UI] Chữ xám `--muted` ở theme sáng chỉ đạt tương phản 2.1:1** — câu dịch ví dụ trong ngăn/tấm, ✕, ghi chú pattern khó đọc. Đề xuất `#6f6862` (4.6:1); đụng toàn app → cần ảnh trước/sau cho Minh duyệt.
8. **[S · UI] Lặt vặt tấm giải thích mobile** — ✕ nhỏ/nhạt (13px), khoảng trống thừa dưới "// chunk i/n", thanh kéo gần vô hình (`bg-line`), nút "←" footer hẹp 36px và sát "tiếp", màn thấp không có dải mờ báo còn nội dung, vạch tiến độ mobile animate `width` 500ms (nên `scaleX` 300ms ease-out), vùng mờ thiếu `ease-out`; footer tràn ở 320px.
9. **[S] Dọn code reader** — số thứ tự cụm tính ở 3 nơi (OriginalText/MobileNoteList/ChunkDrawer) → tính một lần; class nút footer lặp 5 lần → `FooterButton`; chuỗi breakpoint `(max-width: 1023.98px)` → hằng số chung; AnnotationLayer chỉ cần tính ghi chú/mũi tên trên desktop (gạch chân thì vẫn cần trên mobile).

## Đã xong

- 2026-11-05 · Sửa `npm run lint` (ESLint CLI + flat config), lint vào `verify` (cỡ S) — merge vào main (chưa push)
- 2026-11-05 · Hình phác thảo tự vẽ minh hoạ mỗi đoạn (cỡ M) — spec `2026-11-05-passage-sketch-design.md`, merge vào main (chưa push)
- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
