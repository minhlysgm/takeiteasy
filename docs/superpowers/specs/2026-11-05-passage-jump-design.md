# Nhảy nhanh tới đoạn bất kỳ — spec

- Ngày: 2026-11-05 · Cỡ: M · UI
- Mockup: `2026-11-05-jump-lookup-mockup.html` (artifact https://claude.ai/artifact/6gSVNRTKtsfG2j9WH6gi1Z, chung cho 2 việc)

## Mục tiêu & lý do

Hiện chỉ có nút "← trước" / "tiếp →" (và phím ←/→/enter). Đang ở đoạn 10 muốn về đoạn 1 phải bấm 9 lần.
Người đọc nhớ **nội dung** đoạn ("đoạn nói về Bukowski") chứ ít nhớ **số đoạn** → cần một danh sách đoạn
có câu mở đầu để nhìn là nhận ra, bấm là tới.

## Phạm vi

1. **Nút mở danh sách**
   - Desktop: bộ đếm "chương 1 · 2/3" ở footer thành nút, thêm dấu ▾.
   - Mobile: tiêu đề giữa header "chương 1 · đoạn 2/3" thành nút, thêm dấu ▾ (vùng chạm cao 44px).
2. **Danh sách đoạn của chương hiện tại** — mỗi dòng:
   - số đoạn;
   - **câu mở đầu tiếng Anh** của đoạn, một dòng, dài thì cắt "…";
   - dấu ✓ nếu đoạn đã từng mở;
   - đoạn đang đọc được tô nổi (nền accent nhạt + chữ "đang đọc").
   Đầu danh sách ghi tên chương ("Chương 1 · Don't Try") và số đoạn đã đọc ("2/3 đoạn đã đọc").
3. **Dạng hiển thị**
   - Desktop: ô nổi (popover) bật lên ngay phía trên bộ đếm, rộng ~420px, cao tối đa ~60% màn hình, cuộn được.
     Bấm ra ngoài / Esc thì đóng.
   - Mobile: tấm trượt từ dưới lên (giống tấm giải thích), cao tối đa 85% màn hình, nút ✕ để đóng,
     chạm vùng mờ để đóng.
   - Mở ra thì tự cuộn để đoạn đang đọc nằm trong tầm nhìn.
4. **Chọn một dòng** → đóng danh sách, chuyển sang đoạn đó, cuộn lên đầu trang (như bấm "tiếp").
5. **Phím tắt (desktop)**
   - `g` mở/đóng danh sách (thêm `Kbd g` cạnh bộ đếm).
   - Trong danh sách: ↑/↓ di chuyển, enter chọn, Esc đóng.
   - `Home` / `End` nhảy thẳng về đoạn đầu / đoạn cuối chương (không cần mở danh sách).
   - Tấm giải thích đang mở thì `g`, `Home`, `End` không làm gì (giữ luật hiện tại: chỉ Esc/j/k).
6. **Ghi nhớ đoạn đã mở**: mỗi lần mở một đoạn thì lưu vào localStorage `tie:read` (theo sách/chương).

## Ngoài phạm vi

- Mục lục nhiều chương (sách mới có 1 chương) — nhưng dữ liệu/props làm theo dạng "danh sách đoạn của
  một chương" để sau thêm cấp chương không phải làm lại.
- Ô tìm kiếm trong danh sách.
- Kéo/bấm trên thanh tiến độ để nhảy.
- Đồng bộ "đã đọc" giữa các máy.

## Quyết định đã chốt

- Mỗi dòng hiện **câu mở đầu tiếng Anh** (Minh chọn ở ②): giống nguyên văn vừa đọc nên nhận ra ngay.
- "Đã đọc" = **đã từng mở đoạn đó** (không đo cuộn hết hay chưa) — đơn giản, đủ để định hướng.
- Câu mở đầu = phần trước dấu chấm/chấm hỏi/chấm than đầu tiên của `original`, tính sẵn ở server
  (ChapterReader truyền xuống `{ index, firstSentence }[]`, không truyền cả nội dung các đoạn).
- Mobile dùng tiêu đề header làm nút (không thêm nút mới vào footer đã chật ở 320px).
- Dùng lại cách làm của tấm giải thích (khoá cuộn, giữ Tab trong tấm, trả focus khi đóng, `motion-reduce`)
  — tách phần dùng chung ra một khung tấm/ô nổi dùng lại được.

## Tiêu chí nghiệm thu (mỗi dòng → một test e2e)

Desktop (1440×900):

1. Khi bấm bộ đếm "chương 1 · 2/3" thì hiện danh sách 3 đoạn, mỗi dòng có số + câu mở đầu tiếng Anh;
   dòng 2 được đánh dấu đang đọc (`aria-current`).
2. Khi bấm dòng 1 thì danh sách đóng, URL thành `/read/the-subtle-art/ch01/1`, nội dung đoạn 1 hiện và trang ở đầu.
3. Khi nhấn `g` thì danh sách mở; nhấn `g` hoặc Esc lần nữa thì đóng và focus về lại bộ đếm.
4. Khi danh sách mở, nhấn ↑ rồi enter thì chuyển sang đoạn ngay trên đoạn đang đọc.
5. Khi đang ở đoạn 2 nhấn `Home` thì sang đoạn 1; nhấn `End` thì sang đoạn cuối chương.
6. Khi tấm giải thích đang mở thì nhấn `g` / `Home` / `End` không làm gì.
7. Khi đã mở đoạn 1 và 2 (chưa mở đoạn 3) thì danh sách có ✓ ở dòng 1, 2 và không có ở dòng 3;
   tải lại trang vẫn còn ✓.
8. Khi bấm ra ngoài danh sách thì danh sách đóng.

Mobile (390×844):

9. Khi chạm tiêu đề header thì tấm danh sách trượt lên; chạm một dòng thì sang đoạn đó và tấm đóng.
10. Khi chạm ✕ hoặc vùng mờ thì tấm đóng, trang phía sau không bị cuộn theo khi tấm đang mở.
11. Ở 320px tiêu đề vẫn vừa một dòng (cắt "…" nếu cần), vùng chạm ≥ 44px; các dòng trong tấm cao ≥ 44px.

Chung:

12. Theme sáng và tối đều dùng token màu trong `lib/theme.css`; bật `prefers-reduced-motion` thì danh
    sách hiện/ẩn không có hiệu ứng trượt.
