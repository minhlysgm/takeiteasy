# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Hình phác thảo tự vẽ (sketch) minh hoạ đại ý mỗi đoạn — nét vẽ hiện dần, có bút chì chạy theo
- **Cỡ:** M
- **Trạm:** ⑥ Kiểm thử & soi — đã soi xong, chờ Minh chọn mục sửa
- **Đang chờ:** Minh chọn mục trong danh sách dưới (tui khuyên: 1–8 + 10). Chọn xong → sửa (test trước) → `npm run verify` → ⑦.
- **Nhánh:** task/passage-sketch (chưa push, chưa merge). `npm run verify` 2026-11-05 tại b1a8c3b: exit 0, unit 144/144, e2e 33/33.
- **Spec:** docs/superpowers/specs/2026-11-05-passage-sketch-design.md (đã sửa tiêu chí 2, thêm tiêu chí 12) · **Plan:** docs/superpowers/plans/2026-11-05-passage-sketch.md (Task 0–6 xong hết)
- **Minh đã duyệt:** ảnh tĩnh hình đoạn 2 và 3. Minh **chưa xem chuyển động** sau khi sửa (nét vẽ tuần tự sau bút chì) — cho xem ở ⑦.
- **Minh đã chọn:** chờ bản dịch gõ xong VÀ hình lọt vào màn hình (≥ 90%) rồi mới vẽ; chưa vẽ xong thì chưa tính là đã xem.

**Danh sách ⑥ (ui-review + /code-review, chưa sửa).** File chính: components/reader/PassageSketch.tsx, lib/sketch/timeline.ts, components/reader/PassageView.tsx
1. [cao] Bấm chuột vào nút (giải thích/theme/← trước) xong, nút giữ focus → Enter làm việc của nút, không sang đoạn, không bỏ qua gõ chữ. PassageView.tsx:80. Sửa: chỉ nhường Enter cho nút khi focus đến từ bàn phím (:focus-visible), hoặc blur sau click chuột.
2. [vừa] Bút chì che hàng tiêu đề suốt lúc vẽ ở mép trên hình (không chỉ lúc xuất phát); bấm trúng bút = bỏ qua vẽ. Sửa: đệm trên svg ~40 + `pointer-events: none` cho bút.
3. [vừa] Vòng khoanh (cú chốt) bị trần 800ms trong drawMs nên chạy ~300ms, nhanh gấp 3–5 lần nét khác. Sửa: trần riêng cho nét chốt ~1500ms (tổng vẫn trong 8s của tiêu chí 2).
4. [vừa] Chữ tone `muted` trong hình (dòng từ vựng "+ lout · cheapskate · deadbeat") tương phản 2,28:1 ở theme sáng. Sửa: dùng --text.
5. [vừa] Lướt qua hình rồi cuộn đi: onScreen chốt "yes", 0,5–2s sau vẫn vẽ ngoài màn hình và tính là đã xem. Sửa: kiểm lại còn trên màn hình ngay trước khi begin().
6. [thấp] Đo lỗi → finish() ghi đã xem (tui làm ở c849eba, trái spec). Sửa: nhánh lỗi hiện hết nhưng không markSketchSeen.
7. [thấp] "cuộn xuống để xem vẽ…" sai hướng khi đã cuộn quá hình. Sửa: "cuộn tới hình để xem vẽ…" + spec tiêu chí 12.
8. [thấp] "xem ngay" → "↻ vẽ lại" là 2 nút khác nhau, focus rơi về body. Sửa: 1 nút cố định đổi nhãn.
9. [thấp] Bút "nhảy cóc" 100–150px giữa các đoạn con của một nét và ở chuyến đi đầu (trần travel 200ms). Sửa: thêm pha travel ngắn.
10. [thấp] Mobile: hàng tiêu đề hình không wrap → vỡ chữ "// / phác / thảo", cột phình 112→132px khi bắt đầu vẽ rồi co lại. Sửa: flex-wrap + whitespace-nowrap.
11. [thấp] "↻" "⏭" không có trong font mono, rơi font dự phòng (Safari có thể ra emoji — chưa kiểm).
12. [thấp] Vòng khoanh mỏng hơn mockup (2 vs 2.2).
13. [thấp · cleanup] rAF tính lại mảng độ dài mỗi khung hình; roughjs chạy lại mỗi lần mount; sketchSeen.ts trùng logic lib/hints.ts.
14. [thấp] roundNums 2 chữ số chỉ làm hydration mismatch hiếm đi, không triệt hẳn (Safari/Firefox chưa thử). Hướng triệt: tính sẵn path vào content.
Nên đưa backlog (cả app, không riêng hình): footer bị đẩy dưới mép màn hình ở 1440×900; vòng focus xanh mặc định trình duyệt, chưa có style focus chung.

**Lỗi nhỏ đã biết, tui khuyên để nguyên:** ngưỡng 90% không tính lại khi đổi cỡ cửa sổ; `arrowPath` có đầu mũi tên bẹt nếu điểm điều khiển trùng điểm cuối (dữ liệu hiện tại không có); `bukowskiHead` không co nét theo `s` (hiện chưa ai truyền `s`); chưa thử trên Firefox.

## Backlog

1. **[S] `npm run lint` hỏng** — Next 16 đã bỏ `next lint`; chuyển sang ESLint CLI + flat config rồi đưa lint vào `verify`.
2. **[M · UI] Reader chưa dùng được trên mobile** — lưới 4 cột cố định đẩy cột bản dịch ra ngoài màn hình, nguyên văn bị bóp còn ~10 ký tự/dòng, footer vỡ chữ (xem `npm run ui:snap`).
3. **[S · UI] Nút "N" của Next dev che nút "giải thích"** ở góc dưới trái (chỉ khi dev) — dời `devIndicators` sang góc khác.

## Đã xong

- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
