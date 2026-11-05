# Reader trên điện thoại — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dưới 1024px, màn đọc thành một cột xếp chồng, ghi chú tay đánh số, giải thích trượt từ dưới lên, footer gọn dính đáy; desktop giữ nguyên.

**Architecture:** Chuyển đổi bố cục bằng class Tailwind `lg:` (CSS thuần, không đọc bề ngang bằng JS khi render → server và trình duyệt luôn khớp). Phần chỉ-mobile (số cạnh cụm, danh sách ghi chú) render luôn và ẩn bằng `lg:hidden`; phần chỉ-desktop (lề, `AnnotationLayer` hiển thị, nút "enter đoạn tiếp") ẩn bằng `hidden lg:…`. JS theo bề ngang chỉ có ở một chỗ: khoá cuộn trang khi tấm giải thích mở (trong effect).

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind 3.4 · Vitest + Testing Library (jsdom) · Playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-11-05-reader-mobile-design.md` (mockup `2026-11-05-reader-mobile-mockup.html`).

## Global Constraints

- Ngưỡng: Tailwind `lg` (1024px). Từ 1024px trở lên **không đổi gì** về hình và tên nút.
- Màu chỉ dùng token trong `lib/theme.css` (class `bg-bg`, `text-ink`, `border-line`…); hiệu ứng có `motion-reduce:transition-none`.
- Không đổi tên truy cập (accessible name) hiện có của nút: `e giải thích`, `s đọc to`, `t theme`, `enter đoạn tiếp`, `← trước`, `tiếp →`, `đóng…`, `← chunk trước…`, `…chunk sau →`. Test cũ dựa vào chúng.
- Nút mới không được có chữ "giải thích" trong tên (test cũ dùng `/giải thích/` để tìm nút footer).
- Mobile: lề hai bên 16px (`px-4`), nguyên văn 17px, bản dịch 15.5px (giữ nguyên).
- Không đọc `window.innerWidth`/`matchMedia` khi render; chỉ trong effect.
- Mỗi task một commit `feat:`/`test:`/`chore:`, có dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nhánh `task/reader-mobile` từ `main`.
- Xong mỗi task: `npm run lint` và `npx tsc --noEmit` sạch.

## Review Focus

1. **Màn 360px (Android phổ biến)** — footer 5 nút vẫn một hàng, trang không cuộn ngang. → test ở Task 2.
2. **Khoá cuộn bị kẹt** — đóng tấm, hoặc chuyển đoạn khi tấm đang mở, thì trang phải cuộn lại được (`body` hết `overflow: hidden`). → test ở Task 4.
3. **Cụm có nhiều nội dung** (pattern + note, cụm 5 đoạn 1) — nội dung cuộn trong tấm, nút `chunk sau`/`chunk trước` luôn thấy được. → test ở Task 4.
4. **Đổi cỡ cửa sổ qua 1024px khi tấm đang mở** (xoay tablet) — tấm phải nằm trọn trong màn hình ở cỡ mới. → test ở Task 4.
5. **Lệch hình server/trình duyệt** — mở trang mobile không có lỗi hydration trong console. → test ở Task 1.

---

### Task 1: Bố cục một cột + project Playwright mobile

**Files:**
- Modify: `playwright.config.ts` (mảng `projects`)
- Modify: `components/reader/PassageView.tsx` (header ~137-148, lưới ~150-186)
- Create: `e2e/mobile.spec.ts`
- Modify: `e2e/reader.spec.ts` (thêm 1 test desktop)

**Interfaces:**
- Produces: project Playwright `mobile` chạy riêng `e2e/mobile.spec.ts`; hằng `P1 = "/read/the-subtle-art/ch01/1"` và helper `finishTyping(page)` (chạm `translation-col` rồi chờ "đang gõ…" ẩn) trong `e2e/mobile.spec.ts` — các task sau thêm test vào file này.

- [ ] **Step 1: Thêm project `mobile`**

`projects`: `desktop` thêm `testIgnore: /mobile\.spec\.ts/`; thêm `{ name: "mobile", testMatch: /mobile\.spec\.ts/, use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } }` (Chromium, `hasTouch` + `isMobile`).

- [ ] **Step 2: Viết test thất bại trong `e2e/mobile.spec.ts`**

```ts
test("trang không cuộn ngang ở 390px", async ({ page }) => {          // tiêu chí 1
  await page.goto(P1);
  await expect(page.getByTestId("original-col")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test("nguyên văn và bản dịch nằm trọn bề ngang, bản dịch ở dưới", async ({ page }) => { // tiêu chí 2
  // boundingBox của original-col và translation-col: x >= 0, x + width <= 390;
  // translation.y >= original.y + original.height
});
test("chạm bản dịch khi đang gõ thì hiện đủ ngay", async ({ page }) => { // tiêu chí 5
  // goto P1, thấy "đang gõ…", tap translation-col → "đang gõ…" ẩn, translation-col chứa "điểm khởi đầu hoàn hảo"
});
test("header gọn: chỉ chương và số đoạn", async ({ page }) => {
  // header (role banner) chứa "chương 1 · đoạn 1/3", chữ "takeiteasy —" không visible
});
test("không có lỗi hydration", async ({ page }) => {                   // Review Focus 5
  // gom page.on("console") type error; goto P1; chờ original-col; không message nào khớp /hydrat/i
});
```

Thêm vào `e2e/reader.spec.ts` (project desktop, tiêu chí 12): ở 1440×900, `translation-col.x >= original-col.x + original-col.width` (hai cột cạnh nhau).

- [ ] **Step 3: Chạy, thấy đỏ**

Run: `npx playwright test --project=mobile` → FAIL ở test cuộn ngang / bề ngang.

- [ ] **Step 4: Sửa `PassageView.tsx`**

- Lưới: `relative flex grow flex-col overflow-x-clip px-4 py-6 lg:grid lg:grid-cols-[200px_1fr_200px_1fr] lg:px-8 lg:py-12`.
- Hai cột lề trống: thêm `hidden lg:block`.
- `original-col`: `pr-0 lg:pr-6`.
- `translation-col`: `mt-7 border-t border-line pt-6 lg:mt-0 lg:border-t-0 lg:pt-0 lg:pl-12` (vạch chia mobile = viền trên cột dịch).
- Header: `px-4 lg:px-5`; bọc `takeiteasy — {book.id} / ` trong `<span className="hidden lg:inline">`; chữ breadcrumb `truncate`.

- [ ] **Step 5: Chạy lại** — `npx playwright test` (cả 2 project) và `npm test` → PASS hết.

- [ ] **Step 6: Commit** — `feat: stack reader columns below 1024px`

---

### Task 2: Footer mobile, gợi ý phím, mẹo lần đầu

**Files:**
- Create: `components/reader/Kbd.tsx`
- Modify: `components/reader/PassageView.tsx` (footer ~202-263, chỗ render `FirstTimeHint`)
- Modify: `components/reader/FirstTimeHint.tsx`
- Modify: `components/reader/ChunkDrawer.tsx` (chỉ thay `<kbd>` bằng `<Kbd>`)
- Test: `e2e/mobile.spec.ts`, `tests/passage-view.test.tsx`

**Interfaces:**
- Produces: `export function Kbd({ children }: { children: React.ReactNode }): JSX.Element` — render `<kbd className="rounded border border-line px-1.5 py-0.5 text-xs [@media(pointer:coarse)]:hidden">`. Mọi `<kbd>` trong reader dùng component này.

- [ ] **Step 1: Test thất bại (e2e mobile)**

```ts
test("footer dính đáy màn hình, kể cả khi cuộn giữa trang", async ({ page }) => { // tiêu chí 3
  // footer (role contentinfo): bottom ≈ 844 (±1) lúc đầu; window.scrollTo(0, 600); vẫn ≈ 844
});
test("tiếp → sang đoạn 2, ← về đoạn 1", async ({ page }) => {          // tiêu chí 4
  // finishTyping; tap button "tiếp →" → URL /ch01/2; tap "← trước" → /ch01/1
});
test("không thấy gợi ý phím ở footer", async ({ page }) => {          // tiêu chí 10 (phần footer)
  // expect(page.locator("footer kbd:visible")).toHaveCount(0)
});
test("mẹo lần đầu không nhắc tô đen", async ({ page }) => {           // tiêu chí 11
  // locator text=/\/\/ mẹo/ visible: chứa 'chạm "giải thích"', không chứa "tô đen"
});
test.describe("360px", () => {                                        // Review Focus 1
  test.use({ viewport: { width: 360, height: 780 } });
  test("footer một hàng, không cuộn ngang", async ({ page }) => {
    // scrollWidth <= 360; mọi button trong footer có cùng boundingBox().y (±1); footer height <= 61
  });
});
```

Unit (`tests/passage-view.test.tsx`): nút theme vẫn tìm được bằng `{ name: /theme/ }`; nút `← trước` vẫn tìm bằng `/← trước/` (đã có).

- [ ] **Step 2: Chạy, thấy đỏ** — `npx playwright test --project=mobile`.

- [ ] **Step 3: Tạo `Kbd`, thay mọi `<kbd>` trong `PassageView` và `ChunkDrawer`.**

Kiểm tay một lần trong test: ở project mobile `matchMedia("(pointer: coarse)").matches` là `true`; nếu Pixel 7 của Playwright không giả lập được thì báo lại, đừng đổi sang cách khác khi chưa hỏi.

- [ ] **Step 4: Footer (`PassageView.tsx`)**

- Bọc `FirstTimeHint` + `footer` trong `<div className="sticky bottom-0 z-[5] lg:static">`.
- `footer`: `relative h-[60px] gap-1.5 bg-bg px-2 lg:h-14 lg:gap-0 lg:px-8`; các nút `py-1.5` → cao ≥ 38px trên mobile (`h-[38px] lg:h-auto`), `px-2.5 lg:px-3`.
- Nút theme: thêm icon SVG nửa tròn (vòng tròn r=6 viền `currentColor` + nửa phải tô `currentColor`, 16×16, `aria-hidden`, `lg:hidden`); chữ `theme` thành `<span className="sr-only lg:not-sr-only">theme</span>`.
- Nút "enter đoạn tiếp": thêm `hidden lg:flex`.
- Thanh tiến độ desktop (`w-44`): thêm `hidden lg:block`. Thanh mobile mới: `<div aria-hidden className="absolute -top-px left-0 h-0.5 bg-accent transition-[width] duration-500 motion-reduce:transition-none lg:hidden" style={{ width: \`${(passageIndex / passageCount) * 100}%\` }} />`.
- Chữ "chương · i/n": `hidden lg:inline`.
- `← trước` → `←<span className="sr-only lg:not-sr-only"> trước</span>` (tên vẫn "← trước").

- [ ] **Step 5: `FirstTimeHint`** — `px-4 lg:px-8`; hai câu: `<span className="lg:hidden">{'// mẹo: chạm "giải thích" để xem các cụm đáng học'}</span>` và câu cũ trong `<span className="hidden lg:inline">`.

- [ ] **Step 6: Chạy lại** — `npx playwright test`, `npm test` → PASS.

- [ ] **Step 7: Commit** — `feat: compact sticky reader footer on mobile, hide key hints on touch`

---

### Task 3: Ghi chú tay đánh số

**Files:**
- Create: `components/reader/MobileNoteList.tsx`
- Modify: `components/reader/OriginalText.tsx`
- Modify: `components/reader/PassageView.tsx` (trong `original-col` và chỗ render `AnnotationLayer`)
- Test: `tests/mobile-note-list.test.tsx` (mới), `tests/original-text.test.tsx` (mới), `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `Chunk` từ `@/content/types`; `openChunk(chunkId: string)` có sẵn trong `PassageView`.
- Produces:
  - `export function MobileNoteList({ chunks, onChunkClick }: { chunks: Chunk[]; onChunkClick: (chunkId: string) => void }): JSX.Element` — `<ol data-testid="mobile-notes" className="mt-5 flex flex-col gap-2.5 lg:hidden">`, mỗi cụm một `<li><button type="button">`: số tròn (`index + 1`, viền `border-ink`, `aria-hidden`) + `chunk.label` font tay (`font-hand text-[17px] text-ink whitespace-pre-line`, nghiêng ±1deg xen kẽ), vùng chạm cao ≥ 44px.
  - `OriginalText` khi `explainOn`: ngay sau mỗi `span[data-chunk-id]` render `<button type="button" aria-label={\`xem cụm ${n}\`} className="lg:hidden …">{n}</button>` với `n = passage.chunks.indexOf(chunk) + 1`, gọi `onChunkClick(chunk.id)`. Tắt giải thích thì không render.
  - Số trên giao diện = vị trí trong `passage.chunks` (khớp `// chunk i/n` của tấm giải thích).

- [ ] **Step 1: Unit test thất bại**

- `mobile-note-list.test.tsx`: render 3 chunk → 3 button; button thứ 2 chứa "2" và label chunk 2; click button 2 → `onChunkClick` nhận id chunk 2.
- `original-text.test.tsx`: `explainOn=false` → không có button nào; `explainOn=true` với đoạn 5 chunk → có button `xem cụm 1`…`xem cụm 5`; click `xem cụm 3` → `onChunkClick(chunks[2].id)`.

- [ ] **Step 2: E2E thất bại** (tiêu chí 6, 8)

```ts
test("bật giải thích: 5 số cạnh cụm + 5 ghi chú tay giữa nguyên văn và bản dịch", async ({ page }) => {
  // finishTyping; tap "giải thích"; 5 button /^xem cụm \d$/ visible;
  // mobile-notes có 5 button, mỗi box trong [0, 390];
  // mobile-notes.y > box của text nguyên văn; mobile-notes bottom < translation-col.y
});
test("chạm cụm gạch chân hoặc số thì mở đúng cụm", async ({ page }) => {
  // tap [data-chunk-id="chronic"] → dialog chứa "// chunk 1/5"; đóng (button /đóng/);
  // tap "xem cụm 3" → dialog chứa "// chunk 3/5"
});
```

- [ ] **Step 3: Chạy, thấy đỏ** — `npm test` + `npx playwright test --project=mobile`.

- [ ] **Step 4: Cài đặt** — tạo `MobileNoteList`; thêm số vào `OriginalText`; trong `PassageView` render `{explainOn && <MobileNoteList chunks={passage.chunks} onChunkClick={openChunk} />}` giữa `<OriginalText>` và `<SpeechTooltip>`; bọc `AnnotationLayer` trong `<div className="hidden lg:contents">` (gạch chân của rough-notation nằm trong DOM nguyên văn nên vẫn hiện trên mobile; ghi chú lề và mũi tên thì ẩn).

- [ ] **Step 5: Chạy lại** — `npm test`, `npx playwright test` → PASS (cả test desktop explain → click note → drawer cũ).

- [ ] **Step 6: Commit** — `feat: numbered handwritten notes for explain mode on mobile`

---

### Task 4: Tấm giải thích trượt từ dưới lên

**Files:**
- Modify: `components/reader/ChunkDrawer.tsx`
- Test: `tests/chunk-drawer.test.tsx`, `e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: props `ChunkDrawer` không đổi (`chunks, index, closing, onNavigate, onClose`); `Kbd` (Task 2).
- Produces: `data-testid="drawer-backdrop"` giữ nguyên; nút đóng có `aria-label="đóng"`.

- [ ] **Step 1: Unit test thất bại** (`chunk-drawer.test.tsx`)

- Khi render trong jsdom có `matchMedia("(max-width: 1023.98px)")` trả `matches: true` (stub `window.matchMedia`) → `document.body.style.overflow === "hidden"`; unmount → `""`.
- Stub `matches: false` → `body.style.overflow` không bị đổi.

- [ ] **Step 2: E2E thất bại** (tiêu chí 7, 9, 10 phần tấm; Review Focus 2, 3, 4)

```ts
// helper openNote(page, n): finishTyping, tap "giải thích", tap mobile-notes button thứ n,
// chờ dialog có transform đã dừng: expect.poll(() => dialog.boundingBox().y) ổn định.
test("chạm ghi chú 4 → tấm trượt lên, trọn màn hình, đúng cụm", ...);
  // dialog chứa "// chunk 4/5" và heading "look to somebody for something";
  // box: y >= 0, y + height <= 844 (±1), height ≈ 0.85 * 844 (±4), x = 0, width = 390
test("chunk sau → sang cụm 5; ✕ đóng; chạm vùng mờ đóng", ...);
  // tap /chunk sau/ → "// chunk 5/5"; tap name "đóng" → dialog ẩn;
  // mở lại; page.touchscreen.tap(195, 60) → dialog ẩn
test("cụm 5 nhiều nội dung: nút chuyển cụm luôn thấy được", ...);
  // mở cụm 5; button /chunk trước/ visible và bottom <= 844
test("không thấy gợi ý phím trong tấm", ...);
  // dialog.locator("kbd:visible") count 0
test("đóng tấm hoặc chuyển đoạn khi đang mở thì trang cuộn lại được", ...);
  // mở → body overflow "hidden"; đóng → ""; mở lại → page.goto(/ch01/2) → body overflow ""
test("tấm vẫn trọn màn hình khi đổi cỡ qua 1024px", ...);
  // setViewportSize 1440×900, mở cụm (desktop: ghi chú lề), setViewportSize 390×844,
  // chờ ổn định → dialog box nằm trong [0,390]×[0,844]
```

- [ ] **Step 3: Chạy, thấy đỏ.**

- [ ] **Step 4: Cài đặt `ChunkDrawer`**

- Backdrop: `fixed inset-0 z-30 lg:absolute lg:z-10`.
- Vỏ dialog: `fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none lg:absolute lg:inset-y-0 lg:left-auto lg:right-0 lg:z-20 lg:h-auto lg:w-[500px] lg:rounded-none lg:border-l lg:border-t-0`.
- Ẩn/hiện: offscreen → `translate-y-full lg:translate-x-full lg:translate-y-0`; hiện → `translate-x-0 translate-y-0`.
- Thanh kéo trang trí `lg:hidden` (36×4px, `bg-line`, tròn) ở trên cùng.
- Bố cục trong: phần trên (`// chunk i/n` + nút đóng) và phần nội dung nằm trong `<div className="flex-1 overflow-y-auto px-5 pb-5 lg:px-10 lg:pb-0 …">`; hàng nút `← chunk trước` / `chunk sau →` ra ngoài phần cuộn, ghim đáy (`border-t border-line h-14 px-2 lg:border-0 lg:h-auto lg:px-10 lg:pb-10`), mỗi nút `min-h-11`. Desktop nhìn như cũ (padding tổng 40px).
- Nút đóng: `aria-label="đóng"`, `min-h-11 min-w-11`; nội dung `<span className="lg:hidden">✕</span><span className="hidden lg:inline">đóng <Kbd>esc</Kbd></span>`.
- Khoá cuộn: trong effect lúc mount, nếu `window.matchMedia("(max-width: 1023.98px)").matches` thì lưu `body.style.overflow` cũ, gán `"hidden"`, cleanup trả lại giá trị cũ.

- [ ] **Step 5: Chạy lại** — `npm test`, `npx playwright test` → PASS (cả test drawer desktop cũ).

- [ ] **Step 6: Commit** — `feat: bottom sheet chunk explanation on mobile`

---

### Task 5: Dọn và kiểm toàn bộ

**Files:**
- Modify: `e2e/sketch.spec.ts` (nhóm `mobile 390px` ~487-515)

- [ ] **Step 1:** Ở nhóm `mobile 390px`, bỏ chú thích "cột dịch nằm ngoài màn hình (backlog…)" và thay `page.keyboard.press("Shift")` bằng chạm `translation-col` (`click()` — project desktop không có cảm ứng).
- [ ] **Step 2:** `npm run verify` → type-check, lint, unit, e2e (desktop + mobile) đều xanh. Dán số test pass.
- [ ] **Step 3:** `npm run ui:snap` → có ảnh mobile sáng/tối của `/read/the-subtle-art/ch01/1` và `#explain` trong `.ui-snaps/` (chưa soi, để trạm ⑥).
- [ ] **Step 4: Commit** — `test: update mobile sketch test now that the translation fits`
