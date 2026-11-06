# Thẻ "vẽ trước" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Màn đọc chuyển sang "thẻ vẽ trước": hình chạy ngay khi mở thẻ, vẽ xong mới hiện đoạn mô tả tiếng Anh do takeiteasy viết + bản dịch gõ + ý chính + dòng ghi công; bỏ hết nguyên văn sách.

**Architecture:** Đổi dữ liệu `Passage.original` → `caption`, thay nội dung 3 thẻ ch01 bằng bản nháp đã duyệt. `PassageSketch` tự chạy khi mount và báo `onDone("animate" | "instant")`; `PassageView` giữ state `reveal` quyết định hiện đoạn mô tả, bắt đầu gõ bản dịch, hay hiện đủ ngay. Còn lại (chunk, drawer, bôi đen, tra nghĩa, nhảy nhanh) giữ nguyên, chỉ đổi nguồn chữ và chữ "đoạn" → "thẻ".

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind 3 · TypeScript · vitest (`tests/`) · Playwright (`e2e/`).

**Spec:** `docs/superpowers/specs/2026-11-06-sketch-first-design.md` · nội dung 3 thẻ: `docs/superpowers/specs/2026-11-06-sketch-first-cards.html` (file 650KB vì nhúng audio — đọc bằng `sed -E 's/data:audio[^"]{200,}/AUDIO/g' <file>`).

## Global Constraints

- Màu chỉ dùng token trong `lib/theme.css` (qua class Tailwind `bg/text/bright/muted/line/accent/accent-strong/ink/...`); chạy cả theme sáng/tối.
- Mọi animation mới có `motion-reduce:` tương ứng (tắt hẳn).
- Không chép câu chữ sách: caption + chữ trong hình là chữ của takeiteasy (bản nháp đã duyệt). Trích tối đa 1 câu ngắn trong ngoặc kép.
- Chữ trong hình cách mọi nét ≥ 6 đơn vị (hệ toạ độ 520×340), có viền nền `paint-order: stroke`.
- Ví dụ trong chunk là chuyện đời thường, không coding.
- URL giữ nguyên `/read/<book>/<chapter>/<n>`. Khoá localStorage giữ nguyên (`tie:sketch-seen:<passageId>`, `tie:read`, …); id thẻ giữ `ch01-p01..p03`.
- Chữ hiển thị: "thẻ" thay "đoạn" ở mọi chữ người dùng thấy trong `components/reader/` (comment trong code không bắt buộc đổi).
- Dòng ghi công đúng mẫu: `Ý tưởng từ chương 1, <i>The Subtle Art of Not Giving a F*ck</i> — Mark Manson. Hình và lời: takeiteasy.` (lấy từ `book.title`, `book.author`, `chapterLabel(chapterId)`).
- Test trước, code sau. Mỗi task một commit `feat:`/`fix:`/`chore:` trên nhánh `task/sketch-first`. Cuối cùng `npm run verify` xanh.

## Review Focus

1. **Bấm phím / "giải thích" lúc hình đang vẽ** — người đọc quen bấm enter để đi tiếp: phím bất kỳ (trừ Esc) lúc chưa hiện đoạn mô tả → hình hiện đủ + đoạn mô tả + bản dịch hiện đủ ngay (không gõ), không chuyển thẻ; nên vẫn chỉ cần "enter, enter" để sang thẻ kế. Bấm nút "giải thích" lúc đang vẽ → hiện đủ như trên rồi bật giải thích. (Task 5)
2. **Chuyển thẻ giữa lúc đang vẽ / đang gõ** — thẻ mới phải bắt đầu lại từ "đang vẽ…", không mang `reveal` hay chữ gõ dở của thẻ cũ sang, kể cả khi đi bằng back/forward. (Task 5)
3. **Thẻ đã xem rồi mở lại sau khi tải lại trang** — SSR không biết localStorage nên khung đầu là "đang vẽ…", ngay sau mount phải nhảy sang hiện đủ, không gõ lại bản dịch. (Task 5)
4. **Cache tra nghĩa đổi phiên bản** — chỉ đổi khoá cache (`lookup:v2:cache:`); khoá tiền đã tiêu `lookup:v1:spent_usd` và giới hạn lượt `lookup:v1:rl:` **giữ nguyên**, đổi là bộ đếm $9 về 0 → vượt trần tháng. (Task 2)
5. **"↻ vẽ lại" sau khi đã hiện** — chỉ vẽ lại hình; `onDone` gọi lần 2 không được làm bản dịch gõ lại hay giấu đoạn mô tả. (Task 4, Task 5)

---

## File Structure

| File | Việc |
|---|---|
| `content/types.ts` | `original` → `caption`; `sketch` bắt buộc; thêm tone `"accent"` |
| `content/books/the-subtle-art/ch01.ts` | 3 thẻ mới (caption, translation, mainIdea, 4 chunk) |
| `content/books/the-subtle-art/ch01-sketches.ts` | 3 hình mới (port từ SVG bản nháp sang `SketchStep[]`) |
| `components/reader/CaptionText.tsx` | đổi tên từ `OriginalText.tsx` |
| `components/reader/CreditLine.tsx` | mới — dòng ghi công |
| `components/reader/PassageSketch.tsx` | bỏ prop `start`, thêm `onDone`, `ref` có `finish()`, tone accent, viền nền chữ, nhãn "// hình" |
| `components/reader/PassageView.tsx` | state `reveal`, thứ tự cột, chỗ chờ, fade, ghi công, phím, chữ "thẻ" |
| `components/reader/PassageJumpList.tsx`, `FirstTimeHint.tsx` | chữ "thẻ", "đoạn mô tả" |
| `lib/useTypingText.ts` | option `start` |
| `lib/content.ts`, `lib/selection.ts`, `lib/server/handleLookup.ts` | đọc `caption`; cache `lookup:v2:cache:` |
| `components/reader/ChapterReader.tsx` | `firstSentence(p.caption)` |
| `tailwind.config.ts` | keyframe `caption-in` 500ms |
| `scripts/content/cards.ts` | CSS preview thêm class `.accent` |
| `e2e/card-helpers.ts` | mới — `markCardsSeen(page)` |
| `e2e/sketch-first.spec.ts`, `e2e/sketch-first.mobile.spec.ts`, `e2e/sketch-labels.spec.ts` | mới — tiêu chí 1–11, 13b |
| `tests/content.test.ts` | tiêu chí 12, 13 |

---

### Task 1: Đổi tên `original` → `caption` (giữ nội dung cũ)

Đổi tên thuần, hành vi không đổi — tách riêng để reviewer soát dễ.

**Files:**
- Modify: `content/types.ts`, `content/books/the-subtle-art/ch01.ts`, `lib/content.ts` (tên tham số + câu cảnh báo), `lib/selection.ts:82,85`, `lib/server/handleLookup.ts:60-62`, `components/reader/ChapterReader.tsx:21`, `components/reader/PassageView.tsx` (import, `speak(passage.caption)` ở 2 chỗ, `data-testid="original-col"` → `caption-col`)
- Rename: `components/reader/OriginalText.tsx` → `CaptionText.tsx` (component `CaptionText`, `data-testid="caption-text"`); `tests/original-text.test.tsx` → `tests/caption-text.test.tsx`
- Modify tests: mọi file trong `tests/` và `e2e/` dùng `original`, `original-text`, `original-col`, `OriginalText` (danh sách: `grep -rln -E "original" tests e2e`)

**Interfaces:**
- Produces: `Passage.caption: string`; `CaptionText({ passage, explainOn, onChunkClick, ref })`; testid `caption-text`, `caption-col`.

- [ ] **Step 1:** Đổi `Passage.original` → `caption` trong `content/types.ts` (comment: "đoạn mô tả tiếng Anh do takeiteasy viết"). Chạy `npx tsc --noEmit` → danh sách lỗi là danh sách chỗ phải sửa.
- [ ] **Step 2:** Sửa từng chỗ ở Files (kể cả test). `git mv` cho 2 file đổi tên.
- [ ] **Step 3:** `grep -rn -E "\boriginal\b|original-(text|col)|OriginalText" app components lib content tests e2e` → không còn gì (trừ chữ "nguyên văn" trong UI, Task 6 lo).
- [ ] **Step 4:** `npm run verify` → xanh (hành vi chưa đổi).
- [ ] **Step 5:** Commit `chore: đổi Passage.original thành caption`.

---

### Task 2: Nội dung 3 thẻ mới + tone accent + cache tra nghĩa v2

**Files:**
- Modify: `content/types.ts` (tone accent, `sketch` bắt buộc), `content/books/the-subtle-art/ch01.ts`, `content/books/the-subtle-art/ch01-sketches.ts`, `content/sketch-parts.ts` (xoá nếu không còn dùng — `bukowskiHead`, `heart` chỉ hình cũ dùng), `components/reader/PassageSketch.tsx:28-29` (map tone accent), `scripts/content/cards.ts` (CSS preview `.accent{stroke:var(--accent)}` + `text.accent{fill:var(--accent)}`), `lib/server/handleLookup.ts:28`
- Test: `tests/content.test.ts`, `tests/handle-lookup.test.ts:267-268`, và mọi test unit/e2e đang dò câu chữ sách cũ (danh sách: `grep -rln -E "Bukowski|womanizer|chronic|rejection|lout|cheapskate|Which is why" tests e2e`)

**Interfaces:**
- Consumes: `Passage.caption` (Task 1).
- Produces: `SketchTone = "line" | "ink" | "name" | "accent"`; path step `tone: "line" | "ink" | "accent"`; `Passage.sketch: Sketch` (bắt buộc); `ch01Sketches: Record<"p01"|"p02"|"p03", Sketch>` viewBox `"0 0 520 340"`.

- [ ] **Step 1: Test nội dung (tiêu chí 12, 13) trong `tests/content.test.ts`** — thay các test cũ dò câu sách:

```ts
const BANNED = ["a womanizer, a chronic gambler", "the perfect place to start", "rejection slips piled up",
  "Crude.", "Depraved.", "look to for life advice", "alcohol-fueled depression"];
const sketchTexts = (p: Passage) => p.sketch.steps.flatMap((s) => (s.kind === "text" ? [s.text] : []));

for (const p of ch01Passages) {
  test(`${p.id}: mỗi chunk.match nằm trong caption`, () => {
    for (const c of p.chunks) expect(p.caption).toContain(c.match);
  });
  test(`${p.id}: 3–5 câu, 4 chunk, mỗi chunk ≥ 2 ví dụ, có hình + alt`, () => {
    expect(p.caption.split(/(?<=[.?!])\s+/).length).toBeGreaterThanOrEqual(3);
    expect(p.caption.split(/(?<=[.?!])\s+/).length).toBeLessThanOrEqual(5);
    expect(p.chunks).toHaveLength(4);
    for (const c of p.chunks) expect(c.examples.length).toBeGreaterThanOrEqual(2);
    expect(p.sketch.steps.length).toBeGreaterThan(0);
    expect(p.sketch.alt).not.toBe("");
  });
  test(`${p.id}: không còn câu chữ sách cũ`, () => {
    for (const b of BANNED) {
      expect(p.caption).not.toContain(b);
      for (const t of sketchTexts(p)) expect(t).not.toContain(b);
    }
  });
}
```

Lưu ý: caption thẻ 2 có `“Okay, I’m worried,”` — câu đếm theo `.?!` + khoảng trắng; nếu tách câu đếm sai vì dấu ngoặc thì sửa regex test, không sửa nội dung.

- [ ] **Step 2:** `npx vitest run tests/content.test.ts` → FAIL (nội dung cũ).
- [ ] **Step 3: Chép nội dung 3 thẻ vào `ch01.ts`** — từ bản nháp: `<p class="caption">` (bỏ `<span>`/`<sup>`, giữ dấu `’ “ ”` y bản nháp) → `caption`; `<p class="vi">` → `translation`; `<p class="idea">` → `mainIdea`; mảng `CHUNKS[i]` trong `<script>` của bản nháp → `chunks` (đổi tên trường cho khớp `Chunk`: `match` phải là chuỗi khớp nguyên văn trong caption, ví dụ thẻ 1 chunk 2 `match: "bets his rent money on"`, thẻ 3 chunk 4 `match: "okay with that"`). `id` chunk dạng slug (`is-a-mess`, `bet-on`, …). Giữ `id` thẻ `ch01-p01..03`.
- [ ] **Step 4: Port 3 hình sang `ch01-sketches.ts`** — viewBox `"0 0 520 340"`, `alt` = `aria-label` của `<svg>` bản nháp. Mỗi `<path class="s …">` → `{ kind: "path", d, tone }` theo thứ tự `--d` tăng dần; class `s` → `"line"`, `s ink` → `"ink"`, `s acc` → `"accent"`. Mỗi `<text>` → `{ kind: "text", text, x, y, size: 17, tone: "ink" }` (class `acc` → `"accent"`, class `small` → `size: 12`). Path nhiều đoạn con (`M… M…`) để nguyên — `splitSubpaths` lo. Thêm tone accent vào `types.ts` và `STROKE.accent = "stroke-accent"`, `FILL.accent = "fill-accent"` ở `PassageSketch.tsx`. Đổi `sketch?:` → `sketch:`.
- [ ] **Step 5: Cache v2** — `handleLookup.ts:28` đổi tiền tố thành `"lookup:v2:cache:"`; KHÔNG đổi `lookup:v1:spent_usd`, `lookup:v1:rl:` trong `lookupStore.ts`. Sửa `tests/handle-lookup.test.ts:267-268` sang `v2`; thêm vào `tests/lookup-upstash-store.test.ts` một assert rằng khoá tiền vẫn là `"lookup:v1:spent_usd"` (chốt Review Focus 4).
- [ ] **Step 6:** Sửa các test unit/e2e đang dò câu sách cũ sang chuỗi tương ứng trong caption mới (giữ ý test: vd. test tra nghĩa "lout" → một từ trong caption mới như "mess"; test chunk "chronic" → `is-a-mess`). Không xoá test nào chỉ vì đổi nội dung.
- [ ] **Step 7:** `npx vitest run` → PASS; `npm run content -- check` không báo chép sách (nếu tool chỉ chạy trên thẻ trong sổ thì bỏ qua bước này).
- [ ] **Step 8:** Commit `feat: nội dung 3 thẻ vẽ trước + tone accent + cache tra nghĩa v2`.

---

### Task 3: `useTypingText` có option `start`

**Files:**
- Modify: `lib/useTypingText.ts`
- Test: `tests/use-typing-text.test.tsx` (tạo mới nếu chưa có; dùng `renderHook` + fake timers như các test hook khác trong `tests/`)

**Interfaces:**
- Produces: `useTypingText(text, { charMs?, enabled?, start? }): { display, done, skip }`. `start` mặc định `true`. `start: false` → `display === ""`, `done === false`, không hẹn giờ. `start` false→true → bắt đầu gõ từ 0. `enabled: false` → hiện đủ bất kể `start`. `skip()` vẫn hiện đủ khi `start: false`.

- [ ] **Step 1: Test**

```ts
test("start=false: chưa gõ, chưa done", () => { /* renderHook start:false; advance 1000ms → display "" , done false */ });
test("start false→true: bắt đầu gõ", () => { /* rerender start:true; advance → display.length > 0; chạy hết → done */ });
test("enabled=false thắng start=false: hiện đủ", () => { /* display === text, done true */ });
test("đổi text khi start=false: vẫn rỗng", () => { /* rerender text mới → display "" */ });
```

- [ ] **Step 2:** `npx vitest run tests/use-typing-text.test.tsx` → FAIL.
- [ ] **Step 3:** Thêm `start` vào `Options`; effect thêm điều kiện `if (!start) { setCount(0); return; }` (sau nhánh `!enabled`), deps thêm `start`; nhánh reset-lúc-vẽ khi đổi text dùng `enabled ? 0 : text.length` như cũ.
- [ ] **Step 4:** Test PASS; `npx vitest run` toàn bộ PASS.
- [ ] **Step 5:** Commit `feat: useTypingText chờ được tới khi start`.

---

### Task 4: `PassageSketch` tự chạy khi mở, báo `onDone`, có `finish()`

**Files:**
- Modify: `components/reader/PassageSketch.tsx`
- Test: `tests/passage-sketch.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type SketchDone = "animate" | "instant";
  export type SketchHandle = { finish(): void };
  export function PassageSketch(props: {
    sketch: Sketch; passageId: string; dimmed?: boolean;
    onDone?: (how: SketchDone) => void;
    ref?: Ref<SketchHandle>;
  })
  ```
  - Mount mà đã xem (`isSketchSeen`) hoặc reduced-motion → state `done` và gọi `onDone("instant")` đúng một lần.
  - Vẽ xong, bấm "xem ngay ⏭", bấm vào hình, đo lỗi (`reveal(false)`) → `onDone("animate")`.
  - `finish()` qua ref: state khác `done` (kể cả `waiting`) → hiện đủ hình, đánh dấu đã xem, `onDone("animate")`; đã `done` → không làm gì.
  - "↻ vẽ lại" → vẽ xong lại gọi `onDone("animate")` (người dùng phía trên tự bỏ qua).
  - Bỏ prop `start` và chữ "chờ bản dịch gõ xong…"; vẫn chờ hình lọt khung ~90% (`visibleThreshold`) như cũ.
  - Nhãn đầu khối `// phác thảo` → `// hình`; bỏ `mt-9` của `<section>` (giờ đứng đầu cột).
  - `<text>` thêm viền nền: class `stroke-bg [paint-order:stroke]` + `strokeWidth={4}` + `strokeLinejoin="round"`.

- [ ] **Step 1: Test** (giữ các test cũ, sửa chỗ dùng `start`):

```ts
test("đã xem → onDone('instant') một lần, không vẽ", ...);       // markSketchSeen trước khi render
test("reduced-motion → onDone('instant')", ...);                  // mock prefersReducedMotion → true
test("bấm 'xem ngay ⏭' khi đang vẽ → onDone('animate')", ...);
test("ref.finish() khi đang chờ → state done, đã xem, onDone('animate')", ...);
test("ref.finish() khi đã done → không gọi onDone lần nữa", ...);
test("chữ trong hình có viền nền paint-order stroke", ...);       // text có class stroke-bg
```

- [ ] **Step 2:** `npx vitest run tests/passage-sketch.test.tsx` → FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces. Giữ `onDone` mới nhất trong một ref (`useRef` cập nhật mỗi lần vẽ) để callback trong `reveal`/effect không cũ. `useImperativeHandle(ref, () => ({ finish: () => stateRef.current !== "done" && finish() }))`.
- [ ] **Step 4:** Test PASS. (PassageView còn truyền `start` → sửa tạm `PassageView` bỏ prop `start` cho qua type-check; hành vi màn đọc Task 5 lo.)
- [ ] **Step 5:** Commit `feat: hình phác thảo tự chạy và báo khi vẽ xong`.

---

### Task 5: Màn đọc "vẽ trước" — thứ tự, chỗ chờ, hiện dần, ghi công, phím

**Files:**
- Create: `components/reader/CreditLine.tsx`, `e2e/card-helpers.ts`, `e2e/sketch-first.spec.ts`, `e2e/sketch-first.mobile.spec.ts`
- Modify: `components/reader/PassageView.tsx`, `tailwind.config.ts`
- Modify tests: e2e/unit nào giả định bản dịch gõ ngay khi mở (vd. `tests/passage-view.test.tsx`, `tests/passage-switch.test.tsx`, `e2e/reader.spec.ts`, `e2e/selection*.spec.ts`, `e2e/lookup*.spec.ts`, `e2e/passage-*.spec.ts`, `e2e/sketch.spec.ts`) → gọi `markCardsSeen(page)` hoặc chờ reveal; chỉ `sketch-first*.spec.ts` và `sketch.spec.ts` test luồng vẽ.

**Interfaces:**
- Consumes: `PassageSketch` + `SketchHandle` + `SketchDone` (Task 4); `useTypingText` option `start` (Task 3); `Passage.caption`, `CaptionText` (Task 1).
- Produces:
  - `CreditLine({ book, chapterId }: { book: Book; chapterId: string })` → `<p data-testid="credit">Ý tưởng từ {chapterLabel(chapterId)}, <i>{book.title}</i> — {book.author}. Hình và lời: takeiteasy.</p>` (chữ `text-muted`, cỡ 12.5px).
  - `e2e/card-helpers.ts`: `markCardsSeen(page: Page, ids = ["ch01-p01","ch01-p02","ch01-p03"]): Promise<void>` — `addInitScript` set `tie:sketch-seen:<id>` = `"1"`.
  - testid mới: `caption-waiting` ("đang vẽ…"), `translation-waiting` ("bản dịch hiện sau khi vẽ xong."), `credit`.
  - `tailwind.config.ts`: `keyframes["caption-in"]` opacity 0→1, `animation["caption-in"] = "caption-in 500ms ease-out"`.

Luồng trong `PassageView`:
- `const [reveal, setReveal] = useState<"none" | "animate" | "instant">("none")`; đặt lại `"none"` khi đổi `passage.id` ngay trong lúc vẽ (cùng chỗ với các state đoạn khác, ~dòng 93).
- `onDone(how)`: chỉ nhận khi `reveal === "none"` → `setReveal(how)`.
- `typing = useTypingText(passage.translation, { start: reveal === "animate", enabled: reveal !== "instant" })`. Bỏ `typing.skip()` theo reduced-motion trong effect đổi đoạn (sketch báo `instant` thay).
- Cột trái theo thứ tự: `PassageSketch` (ref `sketchRef`, `dimmed={explainOn}`) → nhãn `// mô tả` (+ "N chunks đáng học" khi giải thích) → nếu `reveal === "none"`: `caption-waiting`; caption luôn render nhưng `hidden={reveal === "none"}` (giữ ref cho bôi đen), khi `reveal === "animate"` có `animate-caption-in motion-reduce:animate-none`. `MobileNoteList`, `SelectionPopup` giữ nguyên chỗ sau caption.
- Cột phải: `reveal === "none"` → `translation-waiting`; ngược lại như cũ (nhãn `// bản dịch`, "đang gõ…", chữ gõ, ý chính khi `typing.done`) + `CreditLine` khi `typing.done`.
- Phím: trước nhánh `!typing.done` hiện có, thêm: `reveal === "none" && e.key !== "Escape"` → `sketchRef.current?.finish(); setReveal("instant"); preventDefault; return` (đặt `instant` trước khi `finish()` để `onDone("animate")` bị bỏ qua).
- Nút "giải thích" (footer + mobile) khi `reveal === "none"` → `setReveal("instant"); sketchRef.current?.finish();` rồi bật giải thích như cũ.

- [ ] **Step 1: E2E desktop `e2e/sketch-first.spec.ts`** (1440×900, mỗi test context mới):

```ts
test("1: mở thẻ 1 lần đầu → hình đang vẽ, mô tả + bản dịch đang chờ", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", /waiting|drawing/);
  await expect(page.getByTestId("caption-waiting")).toHaveText("đang vẽ…");
  await expect(page.getByTestId("caption-text")).toBeHidden();
  await expect(page.getByTestId("translation-waiting")).toHaveText("bản dịch hiện sau khi vẽ xong.");
});
test("2: vẽ xong → mô tả hiện, bản dịch gõ; gõ xong → ý chính + ghi công", ...);
  // chờ data-state=done (timeout dài), caption-text visible chứa "is a mess", "đang gõ…" thấy được,
  // rồi chờ ý chính + credit visible
test("3: bấm 'xem ngay ⏭' khi đang vẽ → hình đủ, mô tả hiện, bản dịch bắt đầu gõ", ...);
test("4: thẻ đã xem → hiện đủ ngay; '↻ vẽ lại' thì mô tả vẫn hiện, bản dịch không gõ lại", ...);
  // markCardsSeen; không có "đang gõ…"; credit visible; bấm ↻ → data-state drawing, caption-text visible, credit visible
test("5: reduced-motion → hiện đủ ngay", ...);   // emulateMedia reduce; data-state done, caption + credit visible, không "đang gõ…"
test("7: ghi công đúng ở cả 3 thẻ", ...);         // markCardsSeen; for n in 1..3: credit toHaveText(
  // "Ý tưởng từ chương 1, The Subtle Art of Not Giving a F*ck — Mark Manson. Hình và lời: takeiteasy.")
test("RF1: enter lúc đang vẽ → hiện đủ ngay, chưa chuyển thẻ; enter lần 2 → thẻ 2", ...);
  // URL vẫn /1, caption visible, không "đang gõ…", credit visible; enter → URL /2
test("RF1: bấm 'giải thích' lúc đang vẽ → hiện đủ + bật giải thích", ...);
test("RF2: chuyển sang thẻ 2 giữa lúc vẽ → thẻ 2 bắt đầu lại 'đang vẽ…'", ...);
  // thẻ 1 xem ngay ⏭, đang gõ → bấm nút thẻ tiếp (footer) → caption-waiting visible, sketch waiting|drawing
test("RF3: tải lại thẻ đã xem → không gõ lại bản dịch", ...);  // xem thẻ 1 tới done; reload; credit visible ngay, không "đang gõ…"
```

- [ ] **Step 2: E2E mobile `e2e/sketch-first.mobile.spec.ts`** (390×844, tiêu chí 10):

```ts
test("10: thứ tự hình → mô tả → bản dịch → ý chính → ghi công; hình vẽ khi mở", async ({ page }) => {
  await page.goto("/read/the-subtle-art/ch01/1");
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", /drawing|done/, { timeout: 5000 });
  // xem ngay ⏭, chờ credit; so boundingBox().y tăng dần:
  // sketch < caption-text < translation-col < "// ý chính" < credit
});
```

- [ ] **Step 3:** `npx playwright test e2e/sketch-first` → FAIL.
- [ ] **Step 4:** Cài đặt theo Interfaces + luồng ở trên; thêm keyframe `caption-in`; tạo `CreditLine`, `card-helpers.ts`.
- [ ] **Step 5:** `npx playwright test e2e/sketch-first` → PASS.
- [ ] **Step 6:** Sửa unit/e2e cũ giả định bản dịch gõ ngay khi mở (thêm `markCardsSeen` hoặc bấm "xem ngay ⏭" trước). `npm run verify` → xanh.
- [ ] **Step 7:** Commit `feat: màn đọc vẽ trước — hình chạy trước, vẽ xong hiện mô tả + bản dịch`.

---

### Task 6: Chữ "đoạn" → "thẻ", "nguyên văn" → "mô tả"

**Files:**
- Modify: `components/reader/PassageView.tsx:323,330,448` + mọi aria-label/nhãn có "đoạn"; `components/reader/PassageJumpList.tsx:102,111,159,165`; `components/reader/FirstTimeHint.tsx` (desktop: "…tô đen cụm bất kỳ trong đoạn mô tả để nghe phát âm"); nhãn cột `// nguyên văn` đã thành `// mô tả` ở Task 5 (kiểm lại)
- Modify tests: test nào khớp chữ "đoạn" (`grep -rn "đoạn" tests e2e` — chỉ chuỗi người dùng thấy)
- Test: thêm vào `e2e/sketch-first.spec.ts` + `e2e/sketch-first.mobile.spec.ts`

**Interfaces:** không đổi API.

- [ ] **Step 1: Test**

```ts
// desktop (tiêu chí 6)
test("6: header/footer ghi thẻ; danh sách nhảy nhanh ghi thẻ + câu mở đầu từ đoạn mô tả", async ({ page }) => {
  await markCardsSeen(page);
  await page.goto("/read/the-subtle-art/ch01/2");
  await expect(page.locator("header")).toContainText("chương 1 · thẻ 2/3");
  await expect(page.locator("footer")).toContainText("thẻ tiếp");
  await page.keyboard.press("g");
  const list = page.getByRole("dialog", { name: "danh sách thẻ" }); // hoặc locator theo aria-label hiện có
  await expect(list).toContainText("thẻ đã đọc");
  await expect(list).toContainText("It’s three in the morning and she still can’t fall asleep.");
  await expect(list).not.toContainText("đoạn");
});
// mobile (tiêu chí 11)
test("11: 320px không tràn ngang, header vừa 'chương 1 · thẻ 2/3'", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await markCardsSeen(page);
  await page.goto("/read/the-subtle-art/ch01/2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const t = page.locator("header").getByText("chương 1 · thẻ 2/3");
  await expect(t).toBeVisible();
  // không bị cắt: scrollWidth <= clientWidth của phần tử chứa chữ
});
```

- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Đổi chữ. `grep -n "đoạn" components/reader/*.tsx` chỉ còn trong comment.
- [ ] **Step 4:** `npm run verify` → xanh.
- [ ] **Step 5:** Commit `feat: gọi là thẻ thay cho đoạn`.

---

### Task 7: Chunk / bôi đen trên đoạn mô tả + chữ trong hình không chạm nét

**Files:**
- Create: `e2e/sketch-labels.spec.ts`
- Modify: `e2e/sketch-first.spec.ts` (tiêu chí 8, 9); `content/books/the-subtle-art/ch01-sketches.ts` chỉ khi test 13b đỏ (dời **chữ**, không dời nét, rồi ghi lại chỗ dời trong commit message)

**Interfaces:**
- Consumes: `markCardsSeen` (Task 5); `e2e/selection-helpers.ts`, `e2e/lookup-helpers.ts` hiện có (bôi đen + chặn `/api/lookup`).

- [ ] **Step 1: Test tiêu chí 8, 9** (thêm vào `e2e/sketch-first.spec.ts`):

```ts
test("8: chunk trong mô tả gạch chân, có số, ghi chú lề; bấm mở drawer đúng chunk", ...);
  // markCardsSeen; bật giải thích; 4 [data-chunk-id] trong caption-text; ghi chú lề (label của chunk 1) thấy được;
  // bấm chunk "piling up" → drawer có headword của chunk đó
test("9: bôi đen 'piling up' trong mô tả → popup nghe/tra nghĩa; tra nghĩa gửi đúng start/end", ...);
  // dùng helper bôi đen hiện có; chặn request /api/lookup, kiểm body.start/end
  // === vị trí "piling up" trong passage.caption (lấy từ getPassage)
```

- [ ] **Step 2: Test 13b `e2e/sketch-labels.spec.ts`** — với từng thẻ 1..3: `markCardsSeen` (hình hiện đủ ngay), `await page.evaluate(() => document.fonts.ready)`, rồi trong `page.evaluate` đo trên `[data-testid=sketch-art]`: lấy mọi `path`/`ellipse`, lấy điểm dọc nét mỗi 1 đơn vị (`getTotalLength`/`getPointAtLength`), với mỗi `text` lấy `getBBox()`; lỗi nếu điểm nào nằm trong khung chữ nới 6 đơn vị. Kỳ vọng mảng lỗi rỗng (in ra danh sách lỗi khi đỏ). Thuật toán y hệt `labelClashes` trong `scripts/content/cards.ts:467` (phần đo khoảng cách chữ–nét; bỏ phần chữ đè chữ) — viết hàm tự chứa trong file spec vì `page.evaluate` không mang import theo.
- [ ] **Step 3:** Chạy `npx playwright test e2e/sketch-labels e2e/sketch-first` → 8, 9 PASS (nếu đỏ thì là lỗi thật của Task 1/5, sửa ở đó); 13b PASS hoặc đỏ do nét rough lệch so với bản nháp → dời chữ tới khi xanh.
- [ ] **Step 4:** `npm run verify` → xanh.
- [ ] **Step 5:** Commit `test: chunk, bôi đen và chữ trong hình trên thẻ vẽ trước`.

---

### Task 8: Dọn cuối + STATE

- [ ] **Step 1:** `grep -rn -E "nguyên văn|womanizer|Bukowski was" app components lib content` → chỉ còn ở comment lịch sử (nếu có) — sửa comment nói sai về hành vi mới.
- [ ] **Step 2:** `npm run ui:snap` → kiểm 4 ảnh (desktop/mobile × sáng/tối) không vỡ bố cục rõ ràng (soi kỹ để trạm ⑥).
- [ ] **Step 3:** `npm run verify` → dán số test (vitest / e2e) vào STATE.
- [ ] **Step 4:** Cập nhật `docs/workflow/STATE.md`: ⑤ xong, việc kế ⑥. Commit `chore: state — build vẽ trước xong`.
