# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

**Task:** Reader dùng được trên mobile · **Cỡ:** M · UI · **Trạm:** ④ Plan — **chờ Minh duyệt** plan `docs/superpowers/plans/2026-11-05-reader-mobile.md` (5 task con). Spec đã duyệt 2026-11-05: `docs/superpowers/specs/2026-11-05-reader-mobile-design.md`, mockup https://claude.ai/artifact/XQ614Aeyj2q32gYgmhd84L

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

## Đã xong

- 2026-11-05 · Sửa `npm run lint` (ESLint CLI + flat config), lint vào `verify` (cỡ S) — merge vào main (chưa push)
- 2026-11-05 · Hình phác thảo tự vẽ minh hoạ mỗi đoạn (cỡ M) — spec `2026-11-05-passage-sketch-design.md`, merge vào main (chưa push)
- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
