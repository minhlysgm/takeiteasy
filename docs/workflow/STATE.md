# Trạng thái workflow

> File này là "bộ nhớ" giữa các session. Claude cập nhật ở mọi cổng duyệt và sau mỗi task con.
> Mỗi session mới tự đọc file này (hook SessionStart) → Minh chỉ cần gõ "tiếp".

## Đang làm

- **Task:** Hình phác thảo tự vẽ (sketch) minh hoạ đại ý mỗi đoạn — nét vẽ hiện dần, có bút chì chạy theo
- **Cỡ:** M (1 component + thêm field `sketch?` vào Passage + vẽ tay SVG cho 3 đoạn hiện có)
- **Trạm:** ③ Chốt spec — Minh đã duyệt concept (2026-11-05), đã bổ sung: đoạn nào cũng phải có hình + 5 khuôn vẽ + nhân vật dùng lại
- **Đang chờ:** Minh gõ "tiếp" → sang ④ Plan (mockup: https://claude.ai/artifact/JVcy9dV3j2CUdwuZCJnfMJ)
- **Spec:** docs/superpowers/specs/2026-11-05-passage-sketch-design.md (đã commit) · **Plan:** — · **Nhánh:** task/passage-sketch (chưa tạo)
- **Mockup source:** docs/superpowers/specs/2026-11-05-passage-sketch-mockup.html (bản tham khảo cách vẽ: rough.js generator + timeline rAF + clipPath cho chữ)
- **Quyết định đã chốt (chưa nằm trong spec):** doodle có nhãn tiếng Anh · chỉ cây bút chì chạy theo nét (không bàn tay) ·
  vẽ sau khi bản dịch gõ xong · đặt dưới nguyên văn (cột 2) · Claude vẽ tay SVG từng đoạn ·
  Claude tự chọn: 4–6s, bấm để hiện hết, nút vẽ lại, reduced-motion = hình tĩnh, chỉ animate lần đầu xem đoạn, chỉ desktop ·
  Giai đoạn 2 (không làm): vẽ đồng bộ với "Đọc to"
- **Ghi chú trạm ①:** chỉ có 1 sách/1 chương/3 đoạn → vẽ tay SVG từng đoạn là khả thi. Cột 2 dưới nguyên văn đang trống.
  Đã có sẵn: rough-notation (gạch chân), font Patrick Hand (`font-hand`), keyframe `draw` + `.arrow-draw` (globals.css:12-13),
  token `--ink`, `prefersReducedMotion()` (lib/motion.ts). Bản dịch có hiệu ứng gõ chữ. `lib/speech.ts` chưa có sự kiện boundary.

## Backlog

1. **[S] `npm run verify` đang đỏ vì lỗi type có sẵn** — `tests/annotation-layer.test.tsx:10` (TS2556, spread argument).
2. **[S] `npm run lint` hỏng** — Next 16 đã bỏ `next lint`; chuyển sang ESLint CLI + flat config rồi đưa lint vào `verify`.
3. **[M · UI] Reader chưa dùng được trên mobile** — lưới 4 cột cố định đẩy cột bản dịch ra ngoài màn hình, nguyên văn bị bóp còn ~10 ký tự/dòng, footer vỡ chữ (xem `npm run ui:snap`).
4. **[S · UI] Nút "N" của Next dev che nút "giải thích"** ở góc dưới trái (chỉ khi dev) — dời `devIndicators` sang góc khác.

## Đã xong

- 2026-11-05 · Dựng AI workflow (CLAUDE.md, skill `workflow` + `ui-review`, Playwright e2e, hook SessionStart)
