# Ghép Câu — Design (MVP web)

> Nguồn spec gốc do chủ dự án cung cấp (mục 0–13) là chuẩn duy nhất cho **hình khối,
> màu, luồng, và nội dung**. Tài liệu này KHÔNG thay thế spec đó — nó chỉ ghi lại kiến
> trúc kỹ thuật và các quyết định đã chốt trong vòng brainstorming. Khi có mâu thuẫn,
> spec gốc + các quyết định ở mục "Decisions" bên dưới thắng.

## Nguyên tắc bất di bất dịch (nhắc lại từ spec mục 0)

1. **Copy tiếng Việt nguyên văn** — không sửa/dịch/chuẩn hoá. Văn nói (`ời`, `nhe`, `hen`,
   `haha`, `=))))`, emoji) là cố ý.
2. **Không tự sinh nội dung học tập.** Chỉ dùng đúng dữ liệu mục 6.
3. **Không đổi bảng màu**, không gradient/glow/neon. Phong cách "sticker": nền kem, mảng
   màu đặc, viền đen dày.
4. **Nội dung nằm trong JSON riêng** (`content/scenes/sep-hoi-task.json`) — đây là bản
   authoritative của toàn bộ chuỗi tiếng Việt. Component không nhúng chuỗi.
5. Mâu thuẫn/thiếu → hỏi trước. (Đã làm — xem Decisions.)

## Decisions (chốt trong brainstorming 2026-07-21)

- **D1 — Vàng ở BossScreen:** câu `ok:false` mà người chơi chọn dùng **viền `mastered`
  (vàng) liền** — vàng mang nghĩa "cũng được nhưng chưa hay", đúng tinh thần phản hồi
  động viên (theo đúng câu chữ mục 7.5). Câu `ok:true` vẫn viền `ok` (xanh lá).
  _(Cập nhật audit đợt 1, FIXES.md B3: đảo lại quyết định cũ dùng viền `ink-soft` đứt;
  tiêu chí 13 nới cho phép vàng xuất hiện ở câu Boss chọn-sai, không chỉ combo/đã thuộc.)_
- **D2 — `n/3 đúng tông`** trên SummaryScreen = số câu BossScreen trả lời đúng (0–3).
- **D3 — Trạng thái "đã thuộc" (mastered):** không có flow riêng trong MVP một-cảnh (không
  SRS — ngoài phạm vi). Vàng thực tế chỉ dùng cho combo.
- **D4 — Điểm:** một tổng chạy duy nhất = Σ(`10×combo` mỗi lần ghép đúng) + Σ(`+50` mỗi
  câu boss đúng). `gc:bestScore` lưu giá trị max của tổng này.
- **D5 — Quy trình:** viết plan doc trước, rồi mới code.
- **D6 — Font:** dựng với Baloo 2 `subsets:['latin','vietnamese']`. Verify dấu tiếng Việt
  ở 12–14px bằng screenshot app đang chạy TRƯỚC khi báo hoàn thành. Nếu dấu dính/lệch:
  báo lại + đề xuất thay (ứng viên: Be Vietnam Pro hoặc Nunito cho display). Không tự
  đổi font.

## Stack & kiến trúc

- Next.js (App Router) + TypeScript + Tailwind CSS. Không backend, không DB, không API route.
- Toàn bộ game là **một client component** (`app/page.tsx`) điều phối bởi state machine
  `lib/useGame.ts`.
- Mobile-first: thiết kế cho 390px; desktop căn giữa cột `max-width: 520px`.
- Tiến độ: `localStorage` (bọc try/catch). TTS: Web Speech API. SFX: Web Audio API sinh
  tại chỗ (không tải file). Deploy Vercel (chủ dự án tự làm).

### Cây thư mục (theo spec mục 2)

```
app/            layout.tsx, page.tsx (client, orchestrator)
components/
  screens/      NameScreen, IntroScreen, PlayScreen, BossScreen, SummaryScreen
  game/         Tile, Board, Composer, ChatThread, Bubble, TypingIndicator
  ui/           Button, Chip
content/
  scenes/sep-hoi-task.json     ← authoritative content (verbatim mục 6)
  types.ts                     ← types mục 5
lib/
  speech.ts     TTS (bỏ {name} trước khi đọc, cancel trước mỗi lần, onvoiceschanged)
  sfx.ts        Web Audio: click, ghép đúng (cao dần theo combo), sai, gửi, ping, thắng
  storage.ts    gc:name, gc:bestScore, gc:completed — try/catch
  useGame.ts    state machine
```

### State machine (useGame)

Screens: `name → intro → play(×3 lines) → boss(×3 q) → summary`.
Trạng thái then chốt: `screen`, `name`, `lineIndex`, `bossIndex`, `score`, `bestScore`,
`bossCorrect` (đếm cho D2), `maxCombo`, `combo`, per-line matching state (tiles, ô đã
lấp), khoá tương tác (`locked`) trong lúc animation/kịch bản mở màn.

### Design tokens → Tailwind

Đặt tên **theo vai trò** (mục 3): `bg-page #FFFCF2`, `bg-surface #FFFFFF`,
`bg-sunken #F2ECE0`, `ink #2B2118`, `ink-soft #8A7F6E`, `en #FF7A00`, `vi #00B2A9`,
`mastered #FFD029`, `ok #7ED957`, `no #FF4D3D`. Cấu hình trong `tailwind.config`.
Hình khối: viền `2px` (nút chính `3px`) solid `ink`; bo góc tile/thẻ/bong bóng `14px`,
nút/chip `20px`; gờ nút lún `4px` (tối hơn nền 20%), `:active` tụt `4px`/gờ `0`.
**Không** box-shadow mềm, blur, gradient. Fonts: Baloo 2 (display), Nunito (body) qua
`next/font/google`. Thang chữ: 11 / 12.5 / 14 / 15.5 / 18 / 22 / 32.

## Cơ chế lõi (tóm tắt — chi tiết ở spec mục 7–10)

- **Ghép:** `chunks.length × 2` tile (mỗi cụm 1 tile `en` + 1 tile `vi`, cùng `id`), xáo
  ngẫu nhiên. Chạm 2 tile khác loại cùng `id` → đúng (combo+1, điểm += `10×combo`, đọc cụm
  EN rate 1.0, nổ particle vuông có viền, ô trong Composer được lấp đúng **thứ tự câu**).
  Sai → combo 0, rung, `navigator.vibrate(60)`. Khoá khi animate (đúng 400ms/sai 420ms).
- **Composer:** ô chưa ghép nền `bg-sunken`, viền đứt, **chữ trong suốt** (giữ chiều rộng,
  không đọc được); ô đã ghép nền `vi`, viền liền, chữ hiện, bật lò xo.
- **Gửi tin:** đọc cả câu (rate 0.9, bỏ `{name}`), highlight từng ô theo số ký tự, bong
  bóng người chơi (nền `en`) bay vào chat, "Đã xem", rồi thẻ sắc thái + hộp biến thể (gập,
  mặc định đóng, không tính điểm) + nút tiếp theo.
- **Chat tích luỹ** qua các lượt, không xoá.
- **Boss:** 2 lựa chọn xáo ngẫu nhiên. Chọn → hiện `why` cả hai; `ok:true` viền `ok`,
  câu chọn-sai viền `mastered` (vàng) liền (D1). Đúng +50 + đọc câu đó; sai đọc câu đúng.
  Khoá sau khi chọn.
- **Summary (mục 7.6):** 3 ô số (điểm, `n/3 đúng tông` = bossCorrect, combo cao nhất),
  một dòng động viên ngay dưới tiêu đề "Xong buổi sáng 🎉" (`bossCorrect === 3` → "Ba câu,
  đúng tông cả ba. Chiều nay gõ được liền." / ngược lại → "Hiểu nghĩa thì dễ, chọn đúng
  tông mới khó. Chơi lại thử coi."), transcript chat (mỗi tin người chơi kèm dòng nghĩa
  tiếng Việt), chạm bong bóng người chơi để nghe lại, nút Chơi lại.

## Hiệu ứng (mục 10) — nền sáng nên không dùng ánh sáng

Particle = vuông nhỏ **có viền đen**, màu đặc, toả rồi co. Tile đúng nảy to→0. Ô Composer
bật lò xo `cubic-bezier(.2,1.5,.4,1)`. Combo: chữ to xoay nhẹ viền đen dày. Tôn trọng
`prefers-reduced-motion` (tắt particle, giữ chuyển màu).

## Âm thanh

- **TTS** `lib/speech.ts`: `lang='en-US'`, ưu tiên giọng en-US → en bất kỳ; `cancel()`
  trước mỗi lần; **luôn strip `{name}`**; rate cụm 1.0 / câu 0.9; xử lý `onvoiceschanged`;
  không có API thì im lặng bỏ qua (không crash).
- **SFX** `lib/sfx.ts`: Web Audio sinh tại chỗ. AudioContext khởi tạo ở **user gesture đầu
  tiên** = nút "Mở Zalo ▸" (IntroScreen).

## Ngoài phạm vi (mục 12)

Không: đăng nhập, backend, nhiều cảnh, SRS, streak, thông báo, dark mode, nhận diện vật
thể, đa ngôn ngữ UI. Nhưng token đặt theo vai trò + nội dung tách JSON để mở rộng sau.

## Tiêu chí nghiệm thu (mục 13, đã điều chỉnh theo D1)

- [ ] Chơi hết một mạch trên 390px: không lỗi, không tràn ngang.
- [ ] Mọi chuỗi tiếng Việt khớp **nguyên văn** mục 6.
- [ ] `{name}` thay đúng trong bong bóng Sếp và **không** bị TTS đọc.
- [ ] Ô chưa ghép không đọc được chữ nhưng giữ đúng chiều rộng.
- [ ] Màu `mastered` (vàng) **chỉ** xuất hiện ở combo (D1/D3).
- [ ] Không gradient, không glow, không box-shadow mềm ở bất kỳ đâu.
- [ ] Dấu tiếng Việt hiển thị đúng ở 12px (D6 — verify bằng screenshot).
- [ ] Tắt loa vẫn chơi bình thường.
- [ ] `prefers-reduced-motion` được tôn trọng.
- [ ] Điều hướng bàn phím được, viền focus nhìn thấy.
- [ ] Lighthouse mobile ≥ 90 Performance & Accessibility.
