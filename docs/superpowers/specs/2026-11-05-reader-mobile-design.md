# Reader dùng được trên điện thoại — spec

- Ngày: 2026-11-05 · Cỡ: M · UI
- Mockup: `2026-11-05-reader-mobile-mockup.html` (artifact https://claude.ai/artifact/XQ614Aeyj2q32gYgmhd84L)

## Mục tiêu & lý do

Màn đọc hiện chỉ có lưới 4 cột cố định (`200px 1fr 200px 1fr`). Ở 390px, hai lề 200px nuốt hết chỗ:
bản dịch bị đẩy ra ngoài màn hình, nguyên văn còn ~10 ký tự/dòng, footer vỡ chữ, ngăn giải thích
500px tràn mép. Mục tiêu: đọc trọn một chương trên điện thoại bằng ngón tay, không cần bàn phím,
không phải cuộn ngang.

## Phạm vi

1. **Bố cục mobile dưới 1024px** — một cột, xếp chồng theo thứ tự:
   nhãn `// nguyên văn` → nguyên văn → (ghi chú tay khi bật giải thích) → hình phác thảo →
   vạch chia → `// bản dịch` → bản dịch → `// ý chính`. Lề hai bên 16px. Cỡ chữ giữ nguyên
   (nguyên văn 17px, bản dịch 15.5px).
2. **Ghi chú tay dạng đánh số** khi bật giải thích: mỗi cụm gạch chân có một số tròn nhỏ 1, 2, 3…
   đứng sát sau; danh sách ghi chú tay (font tay, cùng số) nằm ngay dưới nguyên văn. Không vẽ mũi tên.
   Chạm cụm, số hoặc ghi chú đều mở tấm giải thích của cụm đó.
3. **Tấm giải thích trượt từ dưới lên** (thay ngăn bên phải trên mobile): cao 85% màn hình, gắn
   theo màn hình (không theo khung đọc), có thanh kéo trang trí, `// chunk i/n` + nút ✕, nội dung
   cuộn bên trong, dưới đáy cố định nút `← chunk trước` / `chunk sau →`. Đóng bằng ✕, chạm vùng mờ,
   hoặc Esc. Trong lúc mở, trang phía sau không cuộn.
4. **Footer mobile** dính đáy màn hình, một hàng: `giải thích` · `đọc to` · nút theme (icon) ·
   khoảng trống · `←` · `tiếp →`. Tiến độ là vạch xanh 2px chạy dọc mép trên footer.
   Bỏ nút "enter đoạn tiếp" (trùng `tiếp →`) và chữ "chương · i/n" (header đã có).
   Nút cao ≥ 38px, vùng chạm của nút trong tấm giải thích ≥ 44px.
5. **Header mobile** rút gọn: `chương 1 · đoạn 1/3` (+ `· explain` khi bật), bỏ phần `takeiteasy — <book>`.
6. **Máy cảm ứng** (không có chuột, `pointer: coarse`): ẩn mọi gợi ý phím `<kbd>` (e, s, t, enter,
   esc, j, k) ở footer và tấm/ngăn giải thích. Phím tắt vẫn chạy nếu có bàn phím.
7. **Mẹo lần đầu** trên mobile: chỉ còn `// mẹo: chạm "giải thích" để xem các cụm đáng học`
   (bỏ vế tô đen để nghe, vì chưa chạy trên cảm ứng).
8. **Bỏ qua hiệu ứng gõ chữ** bằng cách chạm vào phần bản dịch (như desktop đang có, giờ chạm được).

## Ngoài phạm vi

- Desktop từ 1024px trở lên: giữ nguyên, không đổi gì.
- Bôi đen để nghe / tra nghĩa trên cảm ứng → backlog (mục 6).
- Vuốt xuống để đóng tấm giải thích, vuốt ngang để chuyển đoạn.
- Kệ sách (`/`) trên mobile — chỉ sửa nếu đang vỡ rõ, còn lại ghi backlog.

## Quyết định đã chốt

- Ngưỡng 1024px (Tailwind `lg`): ở 768px nếu giữ 4 cột mỗi cột chữ chỉ còn ~150px.
- Xếp chồng, không dùng tab; ghi chú đánh số; tấm trượt từ dưới lên; bôi đen để task sau (Minh chọn ở trạm ②).
- Ghi chú tay trên mobile là danh sách bình thường trong luồng trang, không định vị tuyệt đối bằng JS.
  Bố cục desktop (lề + mũi tên) giữ nguyên code hiện tại.
- Icon theme vẽ bằng SVG, không dùng ký tự (tránh lỗi rơi font như "↻" ở backlog).

## Tiêu chí nghiệm thu (mỗi dòng → một test e2e ở khung 390×844, có cảm ứng)

1. Khi mở đoạn 1 ở 390px thì trang không cuộn ngang được (chiều rộng nội dung ≤ chiều rộng màn hình).
2. Khi mở đoạn 1 ở 390px thì nguyên văn và bản dịch đều nằm trọn trong bề ngang màn hình, bản dịch nằm dưới nguyên văn.
3. Khi mở đoạn 1 ở 390px thì footer nằm ở đáy màn hình và vẫn ở đó sau khi cuộn xuống giữa trang.
4. Khi chạm "tiếp →" ở footer thì sang đoạn 2; khi chạm "←" thì về đoạn 1.
5. Khi đang gõ bản dịch mà chạm vào phần bản dịch thì bản dịch hiện đủ ngay.
6. Khi chạm "giải thích" thì mỗi cụm có một số (1…n) và có n ghi chú tay cùng số nằm giữa nguyên văn và bản dịch, không ghi chú nào tràn ra ngoài màn hình.
7. Khi chạm ghi chú số 4 thì tấm giải thích mở từ dưới lên, hiện `// chunk 4/5` và tiêu đề của cụm 4, tấm nằm trọn trong màn hình.
8. Khi chạm vào cụm gạch chân hoặc số cạnh cụm thì tấm giải thích mở đúng cụm đó.
9. Khi tấm đang mở mà chạm "chunk sau →" thì sang cụm kế; chạm ✕ hoặc vùng mờ thì tấm đóng.
10. Khi dùng máy cảm ứng thì không thấy gợi ý phím (`<kbd>`) nào ở footer và trong tấm giải thích.
11. Khi mở lần đầu trên mobile thì mẹo không nhắc tới "tô đen".
12. Khi mở ở 1440×900 thì màn đọc vẫn là 4 cột như cũ (các test desktop hiện có vẫn xanh).

## Ghi chú kỹ thuật cho plan

- Thêm project `mobile` vào `playwright.config.ts` (390×844, `hasTouch`, `isMobile`) chỉ chạy file
  test mobile mới; test desktop giữ project `desktop`.
- `AnnotationLayer` chỉ dựng khi ≥ 1024px; dưới đó dùng component danh sách ghi chú mới.
  Cần một hook đọc media query (coi chừng lệch server/trình duyệt — server không biết bề ngang,
  ưu tiên chuyển đổi bằng class CSS `lg:` thay vì JS ở chỗ nào làm được).
- Tấm giải thích: tái dùng nội dung của `ChunkDrawer`, chỉ đổi vỏ (vị trí/hiệu ứng) theo breakpoint;
  hiệu ứng trượt có `motion-reduce`.
- Nhóm test `mobile 390px` cũ trong `e2e/sketch.spec.ts` có chú thích bản dịch bị cắt — cập nhật lại.
