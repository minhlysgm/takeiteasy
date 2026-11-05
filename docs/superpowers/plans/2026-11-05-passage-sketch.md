# Phác thảo tự vẽ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi đoạn trong màn đọc có một hình doodle tự vẽ (nét hiện dần, bút chì chạy theo, nhãn tiếng Anh) nằm dưới nguyên văn, bắt đầu vẽ khi bản dịch gõ xong.

**Architecture:** Dữ liệu hình là danh sách nét có thứ tự (`Passage.sketch`). `lib/sketch/paths.ts` đổi mỗi nét thành chuỗi `d` SVG run tay bằng roughjs (seed cố định, tất định). `lib/sketch/timeline.ts` là logic thuần, tính thời điểm từng nét. `PassageSketch` đo độ dài nét trong trình duyệt rồi chạy vòng `requestAnimationFrame`.

**Tech Stack:** Next.js 16 · React 19 · Tailwind 3 · roughjs ^4.6.6 · vitest + jsdom · Playwright

**Spec:** `docs/superpowers/specs/2026-11-05-passage-sketch-design.md` · mockup chạy được: `docs/superpowers/specs/2026-11-05-passage-sketch-mockup.html` (tham khảo cho timeline, cách vẽ chữ bằng clipPath, bút chì, toạ độ hình đoạn 1)

## Global Constraints

- Màu chỉ lấy từ token qua class Tailwind: nét `stroke-text` / `stroke-ink`, chữ `fill-ink` / `fill-bright` / `fill-muted`. Không có màu hex trong component hay dữ liệu.
- Chữ trong hình dùng `font-hand`. Nét: `fill="none"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, độ dày mặc định 2.
- Tổng thời gian vẽ `SKETCH_TOTAL_MS = 5600`. Bắt đầu sau khi bản dịch gõ xong `SKETCH_START_DELAY_MS = 450`.
- Khoá localStorage: `tie:sketch-seen:<passageId>` = `"1"`.
- Chữ trên UI: `// phác thảo` · `chờ bản dịch gõ xong…` · `đang vẽ…` · nút `xem ngay ⏭` · nút `↻ vẽ lại`.
- Có `motion-reduce`: reduced motion thì hình tĩnh, không bút chì, không nút vẽ lại.
- Không dùng `Math.random` khi dựng nét, để SSR và client ra cùng một hình.
- Ví dụ và nhãn lấy từ chữ trong đoạn văn, không dùng ví dụ coding.
- Mỗi task con một commit, message `feat:` / `fix:` / `test:`, trên nhánh `task/passage-sketch`.

## Review Focus

1. **Môi trường thiếu `getTotalLength` / `getBBox`** (jsdom trong `tests/passage-view.test.tsx`, trình duyệt cũ): component phải không crash và coi độ dài bằng 0. Test nằm ở Task 4.
2. **Đo chữ khi font tay chưa tải xong** thì bút chì chạy lệch khỏi chữ. Phải chờ `document.fonts.ready` (có timeout 1500ms) rồi mới đo `getBBox`. Task 4 chỉ ra chỗ gọi.
3. **Rời đoạn giữa lúc đang vẽ** có thể làm rò `requestAnimationFrame` / `setTimeout` hoặc setState sau unmount. Unmount phải huỷ cả hai. Test nằm ở Task 4 (unmount khi đang vẽ thì không có lỗi console) và e2e tiêu chí 7.
4. **localStorage bị chặn** (Safari private): `isSketchSeen` trả `false` (vẫn vẽ), `markSketchSeen` không ném lỗi. Test nằm ở Task 4.
5. **Hydration mismatch**: nét roughjs phải tất định theo `seed`. Test nằm ở Task 2 (gọi 2 lần ra cùng chuỗi).

---

### Task 0: Gỡ `npm run verify` đang đỏ sẵn

**Files:**
- Modify: `tests/annotation-layer.test.tsx:7`

- [ ] **Step 1:** Chạy `npx tsc --noEmit`. Expected: `TS2556` ở `tests/annotation-layer.test.tsx(10,46)`.
- [ ] **Step 2:** Đổi mock thành `const annotate = vi.fn((..._args: unknown[]) => ({ remove: vi.fn() }));`
- [ ] **Step 3:** Chạy `npx tsc --noEmit && npx vitest run tests/annotation-layer.test.tsx`. Expected: không có lỗi type, test PASS.
- [ ] **Step 4:** Commit `fix: type error in annotation-layer test mock`. Gạch backlog #1 trong `docs/workflow/STATE.md` (cùng commit).

### Task 1: Timeline thuần

**Files:**
- Create: `lib/sketch/timeline.ts`
- Test: `tests/sketch-timeline.test.ts`

**Interfaces — Produces:**
```ts
export type Pt = [number, number];
export const SKETCH_TOTAL_MS = 5600;
export const SKETCH_START_DELAY_MS = 450;
export interface MeasuredStep { kind: "path" | "text" | "pause"; rawMs: number; start: Pt; end: Pt }
export interface TimedStep extends MeasuredStep { from: Pt; t0: number; t1: number; t2: number } // t0→t1 nhấc bút di chuyển, t1→t2 vẽ
export function drawMs(kind: "path" | "text", size: number, plain?: boolean): number
export function buildTimeline(steps: MeasuredStep[], home: Pt, totalMs?: number): TimedStep[]
export function frameAt(tl: TimedStep[], t: number): { index: number; phase: "travel" | "draw" | "done"; progress: number }
```
Luật (copy từ mockup):
- `drawMs("path", len)` = clamp(len × 2.3, plain ? 140 : 110, 800).
- `drawMs("text", chars)` = clamp(chars × 38, 260, 800).
- Thời gian di chuyển = clamp(khoảng cách × 1.3, 50, 200). Riêng `pause` thì di chuyển 0 và `start = end = from`.
- Sau đó nhân mọi thời lượng với một hệ số để `t2` của bước cuối bằng `totalMs`.
- `frameAt`: nếu `t < t1` thì `travel`, progress = (t − t0)/(t1 − t0). Nếu `t1 ≤ t < t2` thì `draw`, progress trong [0, 1]. Nếu `t ≥ t2` của bước cuối hoặc danh sách rỗng thì `{ index: steps.length, phase: "done", progress: 1 }`.

- [ ] **Step 1: Viết test fail**
  - `buildTimeline` cho 3 bước (path, pause 380, text) có `tl.at(-1).t2 ≈ 5600` (sai lệch < 1).
  - Các mốc `t0 ≤ t1 ≤ t2` tăng dần đều. Bước pause có `t1 === t0`.
  - `from` của mỗi bước là `end` của bước trước, bước đầu thì `from === home`.
  - `drawMs("path", 10)` = 110. `drawMs("path", 10, true)` = 140. `drawMs("path", 1000)` = 800. `drawMs("text", 3)` = 260.
  - `frameAt(tl, 0).phase === "travel"`. `frameAt(tl, 99999)` = `{ index: 3, phase: "done", progress: 1 }`. `frameAt([], 0).phase === "done"`.
- [ ] **Step 2:** Chạy `npx vitest run tests/sketch-timeline.test.ts`. Expected: FAIL (không tìm thấy module).
- [ ] **Step 3:** Viết `lib/sketch/timeline.ts` theo Interfaces và luật ở trên.
- [ ] **Step 4:** Chạy lại. Expected: PASS.
- [ ] **Step 5:** Commit `feat: sketch timeline (pure)`.

### Task 2: Kiểu dữ liệu và đổi nét sang SVG

**Files:**
- Modify: `content/types.ts` (thêm vào cuối, và thêm `sketch?: Sketch` vào `Passage`)
- Create: `lib/sketch/paths.ts`
- Modify: `package.json` (`npm i roughjs@^4.6.6`)
- Test: `tests/sketch-paths.test.ts`

**Interfaces — Produces:** kiểu `Sketch`, `SketchStep`, `SketchTone` đúng như mục "Dữ liệu" trong spec, xuất từ `content/types.ts`. Thêm vào `lib/sketch/paths.ts`:
```ts
export type ArrowPoints = [number, number, number, number, number, number, number, number]; // x1,y1, c1x,c1y, c2x,c2y, x2,y2
export function arrowPath(p: ArrowPoints): string    // đường cong + đầu mũi tên 8px, mở ±0.5 rad
export function ellipsePath(e: { cx: number; cy: number; w: number; h: number }): string
export function stepPaths(step: Extract<SketchStep, { kind: "path" | "ellipse" | "arrow" }>): string[]
```
`stepPaths`: `arrow` thì trả `[arrowPath]`. Có `plain: true` thì trả `[d]` gốc. Còn lại dùng `rough.generator()` (khởi tạo một lần ở cấp module) với `{ roughness: step.rough ?? 0.9, bowing: 0.8, seed, strokeWidth: width ?? 2, disableMultiStroke: !multi }`, rồi `generator.toPaths(drawable).map(p => p.d)`.

- [ ] **Step 1: Viết test fail**
  - `arrowPath([0,0, 10,0, 20,0, 30,0])` bắt đầu bằng `"M0,0 C"` và chứa `"L30,0"` (đầu mũi tên quay về điểm cuối).
  - `stepPaths({kind:"path", d:"M0,0 L100,0", tone:"line", seed:7})` gọi 2 lần ra mảng giống hệt nhau, có ít nhất 1 phần tử, và khác `"M0,0 L100,0"`.
  - `stepPaths({kind:"path", d:"M1,1 l.5,.5", tone:"line", plain:true})` bằng `["M1,1 l.5,.5"]`.
  - `stepPaths({kind:"ellipse", cx:50, cy:50, w:40, h:20, tone:"ink", seed:3, multi:true})` có độ dài ≥ 1.
- [ ] **Step 2:** Chạy `npx vitest run tests/sketch-paths.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Cài roughjs, thêm kiểu dữ liệu, viết `lib/sketch/paths.ts`.
- [ ] **Step 4:** Chạy test cộng thêm `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: sketch data types + rough path builder`.

### Task 3: Ghi nhớ "đã xem hình"

**Files:**
- Create: `lib/sketchSeen.ts` (theo mẫu `lib/hints.ts`)
- Test: `tests/sketch-seen.test.ts`

**Interfaces — Produces:** `isSketchSeen(passageId: string): boolean` và `markSketchSeen(passageId: string): void`, dùng khoá `tie:sketch-seen:<id>`.

- [ ] **Step 1: Viết test fail**
  - Ban đầu `false`. Sau khi `markSketchSeen("ch01-p01")` thì `true`, và `localStorage.getItem("tie:sketch-seen:ch01-p01") === "1"`.
  - Khi `localStorage.getItem`/`setItem` bị stub để ném lỗi: `isSketchSeen` trả `false`, `markSketchSeen` không ném.
- [ ] **Step 2:** Chạy test, xác nhận FAIL. **Step 3:** Viết code. **Step 4:** Chạy test, PASS.
- [ ] **Step 5:** Commit `feat: remember seen sketches`.

### Task 4: Component `PassageSketch`

**Files:**
- Create: `components/reader/PassageSketch.tsx`
- Test: `tests/passage-sketch.test.tsx`

**Interfaces:**
- Consumes: `buildTimeline`, `frameAt`, `drawMs`, `SKETCH_START_DELAY_MS` (Task 1) · `stepPaths` (Task 2) · `isSketchSeen`, `markSketchSeen` (Task 3) · `prefersReducedMotion` (`lib/motion.ts`)
- Produces: `export function PassageSketch(props: { sketch: Sketch; passageId: string; start: boolean; dimmed?: boolean }): JSX.Element`

Hành vi:
- **Khung ngoài:** `<section data-testid="sketch" data-state={state}>`, với `state: "idle" | "waiting" | "drawing" | "done"`. Khi `dimmed` thì thêm `opacity-30 transition-opacity motion-reduce:transition-none`.
- **Đầu khung:** label `// phác thảo`. Bên cạnh là dòng trạng thái: `waiting` hiện "chờ bản dịch gõ xong…", `drawing` hiện "đang vẽ…". Nút `xem ngay ⏭` chỉ có khi `drawing`. Nút `↻ vẽ lại` chỉ có khi `done` và không bật reduced motion.
- **Hình:** `<svg viewBox={sketch.viewBox} role="img" aria-label={sketch.alt}>`.
  - Nét lấy từ `useMemo(() => stepPaths(...))`, nên SSR cũng có sẵn.
  - Chữ là `<text>` có `clipPath` riêng. Chữ "viết ra" bằng cách tăng dần `width` của `rect` trong clipPath.
  - Khi `idle` thì nhóm nét có `opacity: 0`, để không lộ hình trước khi biết là cần vẽ hay hiện sẵn.
- **Bút chì:** `<g data-testid="sketch-pencil">`, chỉ render khi `drawing`. Hình dạng và góc nghiêng −52° lấy y như mockup. Màu: ngòi `fill-text`, thân `fill-ink`, đầu kim loại `fill-muted`, tẩy `fill-danger`. Phần gỗ dùng `fill-surface` có viền `stroke-text` (không thêm token mới).
- **Khi mount:**
  - Reduced motion hoặc `isSketchSeen(passageId)` thì vào `done`.
  - Còn lại thì vào `waiting`.
- **Bắt đầu vẽ:** khi đang `waiting` và `start` thành `true`, chờ `SKETCH_START_DELAY_MS` rồi:
  1. Đo, sau khi `await` `Promise.race([document.fonts.ready, 1500ms])` (Review Focus 2).
     - Nét: `getTotalLength()` + 2. Hàm không có thì độ dài = 0.
     - Chữ: `getBBox()`. Hàm không có thì bbox = 0.
     - Điểm đầu và cuối: `getPointAtLength`. Hàm không có thì dùng `[0, 0]`.
  2. `buildTimeline(measured, [vbWidth − 10, 8])`.
  3. Chạy `requestAnimationFrame`. Mỗi khung hình dùng `frameAt` để tính:
     - Nét đang vẽ: `strokeDashoffset = len × (1 − ease(p))`.
     - Bút chì: đầu ngòi đặt tại `getPointAtLength`. Lúc di chuyển giữa hai nét thì nội suy thẳng và nhấc lên 6px theo hình sin.
  4. Hàm ease: `0.5 − cos(πx)/2`.
- **Kết thúc:** vẽ hết, bấm vào svg, hoặc bấm "xem ngay" thì vào `done`: mọi nét đủ, mọi chữ lộ hết, rồi `markSketchSeen`. Bấm svg khi đã `done` thì không làm gì.
- **Vẽ lại:** "↻ vẽ lại" đưa về `drawing` từ đầu, không chờ delay.
- **Unmount:** huỷ rAF và timeout (Review Focus 3).

- [ ] **Step 1: Viết test fail.** Đầu file stub `SVGElement.prototype.getBBox`, `getTotalLength` và `getPointAtLength` bằng `vi.fn`. Có một case xoá stub để kiểm Review Focus 1. Dùng `vi.useFakeTimers()`. Fixture: một `Sketch` nhỏ gồm 1 path, 1 text, 1 pause.
  - `start=false` thì `data-state="waiting"` và có chữ "chờ bản dịch gõ xong…".
  - `localStorage["tie:sketch-seen:p"]="1"` thì `data-state="done"` ngay, không có `sketch-pencil`, có nút "↻ vẽ lại".
  - Reduced motion (stub `matchMedia` trả `matches: true`) thì `done`, không có nút "↻ vẽ lại".
  - `start=true`, chạy timer 450ms và flush promise thì `drawing`, có `sketch-pencil`. Bấm "xem ngay ⏭" thì `done`, `localStorage` có khoá đã xem.
  - Ở `done`, bấm "↻ vẽ lại" thì `drawing`.
  - Svg có `role="img"` và tên đúng bằng `alt`.
  - Xoá stub đo SVG, render với `start=true` và chạy timer: không ném lỗi.
  - Unmount khi đang `drawing`, chạy tiếp timer: `console.error` không bị gọi.
- [ ] **Step 2:** Chạy `npx vitest run tests/passage-sketch.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Viết component.
- [ ] **Step 4:** Chạy test cộng thêm `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: PassageSketch component`.

### Task 5: Hình đoạn 1, gắn vào màn đọc, e2e

**Files:**
- Create: `content/sketch-parts.ts`
- Create: `content/books/the-subtle-art/ch01-sketches.ts`
- Modify: `content/books/the-subtle-art/ch01.ts` (gán `sketch: ch01Sketches.p01` cho đoạn 1)
- Modify: `components/reader/PassageView.tsx`, trong cột nguyên văn ngay sau `<SpeechTooltip … />` (~dòng 143)
- Modify: `tests/passage-view.test.tsx`
- Create: `e2e/sketch.spec.ts`

**Interfaces — Produces** (`content/sketch-parts.ts`):
```ts
export function heart(cx: number, cy: number, s: number): string                        // chuỗi d
export function bukowskiHead(o: { x: number; y: number; s?: number }): SketchStep[]     // đầu, tóc rối, mắt lờ đờ, mũi + miệng, râu lún phún; (x,y) = tâm đầu, s = tỉ lệ (mặc định 1)
```
`ch01Sketches.p01` port đúng toạ độ, thứ tự, seed và nhãn từ mảng `STEPS` trong mockup (viewBox `"0 0 480 330"`), bản đã chỉnh vòng khoanh `{cx:240, cy:156, w:138, h:206}`. Phần đầu thay bằng `bukowskiHead({ x: 240, y: 92 })`.
`alt`: "Phác thảo: Charles Bukowski cầm chai rượu (alcoholic), trái tim (womanizer), xúc xắc (chronic gambler), tờ thơ (a poet, on his worst days); vòng tròn khoanh ông lại kèm chữ the perfect place to start."

PassageView: `{passage.sketch && <PassageSketch sketch={passage.sketch} passageId={passage.id} start={typing.done} dimmed={explainOn} />}`. Cột nguyên văn đã có `key={passage.id}`, nên chuyển đoạn sẽ remount sketch (tiêu chí 7).

- [ ] **Step 1: Viết test fail.**

  Unit, trong `tests/passage-view.test.tsx`:
  - Đoạn 1 có `getByTestId("sketch")`.
  - Một passage clone bỏ `sketch` thì `queryByTestId("sketch")` là null (tiêu chí 8).

  E2E `e2e/sketch.spec.ts`, dùng lại helper `finishTyping` (chép từ `e2e/reader.spec.ts`), mỗi test một context sạch:
  1. Vào `/read/the-subtle-art/ch01/1`: `sketch` có `data-state="waiting"` và chữ "chờ bản dịch gõ xong…" trong lúc "đang gõ…" còn hiện.
  2. `finishTyping`: thấy `sketch-pencil` và `data-state="drawing"`. Sau đó `data-state="done"` với `timeout: 8000`, `sketch-pencil` có count 0, nút "↻ vẽ lại" hiện.
  3. `finishTyping`, chờ `drawing`, bấm vào `getByRole("img", { name: /Charles Bukowski/ })`: `done` ngay (timeout 500).
  4. Ở `done`, bấm "↻ vẽ lại": `drawing`.
  5. Vẽ xong đoạn 1 (bấm "xem ngay ⏭"), nhấn `Enter` sang đoạn 2, bấm "← trước": đoạn 1 `done` ngay, không có bút chì.
  6. `page.emulateMedia({ reducedMotion: "reduce" })` rồi vào đoạn 1: `done`, không bút chì, không nút "↻ vẽ lại".
  7. Đang `drawing` ở đoạn 1 thì nhấn `Enter`. URL `/ch01/2`, không có lỗi `pageerror`. Bước này cần đoạn 2 có hình nên **chạy ở Task 6**: viết sẵn với `test.fixme`, Task 6 bỏ `fixme`.
  8. Bật "giải thích": `sketch` có class `opacity-30`.
  9. `getByRole("img", { name: /^Phác thảo: Charles Bukowski/ })` hiện.
- [ ] **Step 2:** Chạy `npx vitest run tests/passage-view.test.tsx && npx playwright test e2e/sketch.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Viết `sketch-parts`, `ch01-sketches.p01`, gắn vào `ch01.ts` và `PassageView`.
- [ ] **Step 4:** Chạy lại lệnh ở Step 2. Expected: PASS (case 7 bị skip). Mở `npm run dev`, nhìn tận mắt đoạn 1 so với mockup.
- [ ] **Step 5:** Commit `feat: sketch for ch01 passage 1 in reader`.

### Task 6: Hình đoạn 2 và 3, mọi đoạn bắt buộc có hình

**Files:**
- Modify: `content/books/the-subtle-art/ch01-sketches.ts` (thêm `p02`, `p03`)
- Modify: `content/books/the-subtle-art/ch01.ts`
- Modify: `tests/content.test.ts`
- Modify: `e2e/sketch.spec.ts` (bỏ `fixme` case 7)

Nội dung (khuôn đã chốt trong spec, dùng `bukowskiHead` để mặt giống đoạn 1):
- **p02, cảnh / tình huống.** Bukowski ngồi trước máy chữ. Chồng giấy cao dần, đóng dấu "REJECTED". Chữ rơi quanh: "Crude." "Disgusting." "Depraved." Nhãn "rejection slips piled up", "for decades". Chai rượu, mây đen trên đầu.
  Nét chốt: mũi tên đè xuống + "deep into depression".
- **p03, so sánh trái – phải.** Bên trái: người que leo bục "winner", nhãn "determination to be a winner", bị gạch ✗. Bên phải: Bukowski cầm gương, nhãn "honest with himself". Chuỗi nhỏ "knew it → accepted it → wrote honestly".
  Nét chốt: khoanh bên phải + "✓ honest".
- Mỗi hình có `alt` tiếng Việt mô tả như p01.
- **Cổng Minh:** vẽ xong thì chụp hình đoạn 2 và 3 (`npm run ui:snap` hoặc chụp bằng Playwright), gửi Minh duyệt **trước khi commit**. Minh muốn sửa thì sửa rồi gửi lại.

- [ ] **Step 1: Viết test fail.** Trong `tests/content.test.ts`, thêm cho mỗi passage một case `${p.id}: có sketch hợp lệ`:
  - `p.sketch` tồn tại.
  - `alt.length > 10`.
  - `viewBox` khớp `/^0 0 \d+ \d+$/`.
  - Có ít nhất 1 bước `text` và ít nhất 1 bước `path`, `ellipse` hoặc `arrow`.
  - Mọi `seed` (nếu có) là số nguyên.
- [ ] **Step 2:** Chạy `npx vitest run tests/content.test.ts`. Expected: FAIL ở `ch01-p02` và `ch01-p03`.
- [ ] **Step 3:** Vẽ `p02` và `p03`, gắn vào `ch01.ts`, bỏ `fixme` ở case 7.
- [ ] **Step 4:** Chạy `npm run verify`. Expected: tất cả xanh (type-check + unit + e2e).
- [ ] **Step 5:** Gửi ảnh cho Minh, chờ duyệt. **Step 6:** Commit `feat: sketches for ch01 passages 2-3 + require sketch per passage`.

---

Sau Task 6 là trạm ⑥: `npm run verify`, skill `ui-review` (desktop × sáng/tối, kiểm tiêu chí 11), rồi `/code-review`.
