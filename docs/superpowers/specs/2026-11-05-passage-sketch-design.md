# Phác thảo tự vẽ cho mỗi đoạn — spec

- **Ngày:** 2026-11-05 · **Cỡ:** M · **Nhánh:** `task/passage-sketch`
- **Mockup đã xem:** https://claude.ai/artifact/JVcy9dV3j2CUdwuZCJnfMJ (đoạn 1 — Bukowski) · mã nguồn: `2026-11-05-passage-sketch-mockup.html`

## Mục tiêu & lý do

"Đọc to" và "Giải thích" đã lo phần nghe và hiểu chữ. Còn thiếu **hình ảnh**: đọc toàn chữ dễ chán, có hình thì
thú vị và dễ nhớ hơn. Mỗi đoạn có một **hình phác thảo kiểu doodle** tự vẽ ra (nét hiện dần, cây bút chì chạy theo),
thể hiện **đại ý** của đoạn. Các chi tiết trong hình gắn **nhãn tiếng Anh** lấy từ đoạn văn, nên hình đồng thời là
một tấm thẻ từ vựng bằng hình.

## Phạm vi

- Khung `// phác thảo` nằm **dưới đoạn nguyên văn** (cột 2), chỉ hiện khi đoạn có dữ liệu `sketch`.
- Hình bắt đầu vẽ **sau khi bản dịch gõ xong**, kể cả khi user bấm để hiện hết bản dịch. Vẽ trong khoảng 5–6 giây.
- Có **cây bút chì** nghiêng chạy theo đầu nét đang vẽ. Không có bàn tay.
- Đang vẽ: bấm vào hình hoặc nút "xem ngay" thì hiện hết. Vẽ xong: nút "↻ vẽ lại".
- **Chỉ vẽ có hiệu ứng ở lần đầu xem đoạn đó.** Những lần sau hình hiện sẵn. Ghi nhớ bằng localStorage `tie:sketch-seen:<passageId>`.
- "Giảm chuyển động" (`prefers-reduced-motion`): hình hiện tĩnh, đầy đủ, không có bút chì.
- Bật "giải thích": khung phác thảo mờ đi giống cột bản dịch, để mắt tập trung vào các chunk.
- **Đoạn nào cũng có hình.** Vẽ cho cả 3 đoạn hiện có của ch01. Hình đoạn 2 và 3 gửi Minh xem trong lúc Build, trước khi chốt nội dung.
  Có unit test quét toàn bộ nội dung sách: đoạn nào thiếu `sketch` thì test đỏ, nên thêm đoạn mới mà quên vẽ sẽ bị phát hiện ngay.

## Cách nghĩ hình cho một đoạn bất kỳ

Mỗi đoạn chọn **một** trong 5 khuôn, rồi luôn kết bằng một **nét chốt** thể hiện ý chính:

| Khuôn | Hợp với loại đoạn | Ví dụ |
|---|---|---|
| Chân dung + đồ vật | Giới thiệu nhân vật | Đoạn 1: Bukowski + chai rượu, xúc xắc… → khoanh tròn "the perfect place to start ✓" |
| Cảnh / tình huống | Kể chuyện | Đoạn 2: Bukowski bên máy chữ, chồng thư "REJECTED" cao dần, mây đen trên đầu → mũi tên đè xuống "deep into depression" |
| So sánh trái – phải | Đối lập, nghịch lý | Đoạn 3: bên trái người cố leo bục "winner" bị gạch ✗; bên phải Bukowski soi gương, viết thật về mình → ✓ "honest" |
| Chuỗi mũi tên | Lập luận A dẫn tới B | "knew it → accepted it → wrote honestly about it" |
| Ẩn dụ hình ảnh | Ý trừu tượng | "gánh nặng" → tảng đá, "vòng luẩn quẩn" → vòng tròn mũi tên |

- **Nhân vật lặp lại thì vẽ giống nhau** giữa các đoạn: Bukowski luôn tóc rối, mắt lờ đờ, râu lún phún.
  Phần vẽ nhân vật được tách thành mảnh dùng lại (`content/sketch-parts.ts`), đặt vào vị trí và tỉ lệ khác nhau.
- Nhãn tiếng Anh ưu tiên lấy đúng chữ trong đoạn, nhất là các chunk đang dạy.

## Ngoài phạm vi (để sau)

- Vẽ khớp theo "Đọc to" (đọc tới chữ nào thì vẽ chi tiết đó). Để giai đoạn 2, vì trình duyệt không báo vị trí đọc ổn định.
- Giao diện mobile. Màn đọc chưa dùng được trên mobile (backlog #3), khung phác thảo sẽ theo khi làm task đó.
- Tự động sinh hình (bằng AI) cho đoạn mới.

## Quyết định đã chốt

| Chủ đề | Chốt |
|---|---|
| Phong cách | Doodle: người que và đồ vật đơn giản, nét hơi run tay, một màu |
| Màu | Người và đồ vật dùng `--text`. Nhãn, mũi tên, vòng khoanh dùng `--ink` (giống ghi chú khi giải thích). Tên nhân vật dùng `--bright`, chi tiết phụ dùng `--muted` |
| Chữ trong hình | Font tay `font-hand` (Patrick Hand) đang có. Chữ "viết ra" bằng cách lộ dần từ trái sang phải |
| Hiệu ứng run tay | Thêm thư viện `roughjs` (cùng tác giả với `rough-notation` đang dùng), cố định `seed` để lần nào vẽ cũng giống nhau |
| Nguồn hình | Claude vẽ tay từng hình dưới dạng danh sách nét SVG, lưu trong dữ liệu sách |
| Bố cục hình | Có tên nhân vật hoặc chủ thể. Mỗi ý chính có một chi tiết kèm nhãn tiếng Anh. Nét cuối thể hiện "cú chốt" của đoạn (ví dụ đoạn 1: khoanh tròn + "the perfect place to start ✓") |

## Dữ liệu

Thêm field tuỳ chọn `sketch?: Sketch` vào `Passage` (`content/types.ts`):

```ts
type SketchTone = "line" | "ink" | "name" | "muted";
type SketchStep =
  | { kind: "path"; d: string; tone: "line" | "ink"; width?: number; rough?: number; seed?: number; plain?: boolean }
  | { kind: "ellipse"; cx: number; cy: number; w: number; h: number; tone: "line" | "ink"; rough?: number; seed?: number; multi?: boolean }
  | { kind: "arrow"; points: [number, number, number, number, number, number, number, number]; tone: "ink" }
  | { kind: "text"; text: string; x: number; y: number; size: number; tone: SketchTone; anchor?: "start" | "middle" | "end" }
  | { kind: "pause"; ms: number };
type Sketch = { viewBox: string; alt: string; steps: SketchStep[] }; // alt: mô tả tiếng Việt cho trình đọc màn hình
```

Các bước được vẽ đúng theo thứ tự trong `steps`. Tổng thời gian được co giãn về khoảng 5,6 giây, nên đoạn nào nhiều nét hay ít nét thì vẫn vẽ trong cùng một khoảng.

## Tiêu chí nghiệm thu (mỗi dòng = một test e2e)

1. Khi mở một đoạn có hình **lần đầu** và bản dịch đang gõ, thì khung `// phác thảo` hiện nhưng chưa có nét nào, kèm dòng "chờ bản dịch gõ xong…".
2. Khi bản dịch gõ xong (hoặc user bấm để hiện hết), thì hình bắt đầu vẽ và bút chì hiện. Trong vòng 8 giây thì hình đầy đủ, bút chì ẩn, nút "vẽ lại" hiện.
3. Khi hình đang vẽ mà bấm vào hình hoặc "xem ngay", thì hình hiện đầy đủ ngay lập tức.
4. Khi bấm "vẽ lại", thì hình xoá đi và vẽ lại từ đầu.
5. Khi quay lại một đoạn đã xem hình, thì hình hiện sẵn đầy đủ, không có bút chì, không vẽ lại.
6. Khi trình duyệt bật giảm chuyển động, thì hình hiện tĩnh đầy đủ ngay, không có bút chì.
7. Khi chuyển sang đoạn khác lúc hình đang vẽ, thì hiệu ứng cũ dừng và đoạn mới bắt đầu theo đúng luật của nó (chờ, hoặc hiện sẵn).
8. Khi đoạn không có dữ liệu `sketch`, thì không có khung `// phác thảo` (an toàn khi lỗi). Đồng thời có unit test: mọi đoạn trong `content/` đều có `sketch`.
9. Khi bật "giải thích", thì khung phác thảo mờ đi giống cột bản dịch.
10. Hình có `role="img"` và `aria-label` lấy từ `sketch.alt`.
11. Khi đổi theme sáng/tối, thì nét và chữ trong hình đổi màu theo token (kiểm bằng `npm run ui:snap`, không dùng màu cứng).

## Rủi ro

- Hình đẹp tới đâu phụ thuộc vào việc Claude vẽ tay. Chấp nhận mức doodle, mỗi hình cho Minh xem trước.
- Mỗi đoạn mới phải vẽ thêm một hình. Vì `sketch` là tuỳ chọn, đoạn chưa có hình vẫn chạy bình thường.
