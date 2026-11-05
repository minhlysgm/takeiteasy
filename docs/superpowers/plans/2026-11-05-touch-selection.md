# Bôi đen để nghe / tra nghĩa trên cảm ứng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bôi đen một cụm trong nguyên văn trên điện thoại thì hiện thanh "▶ nghe · ⌕ tra nghĩa" dính đáy; desktop giữ popup nổi, thêm kẹp mép / lật xuống.

**Architecture:** Thay `SpeechTooltip` (chỉ nghe `mouseup`) bằng một hook `useTextSelection` nghe `selectionchange` (chờ 250ms đứng yên; chuột đang giữ thì chờ thả). `PassageView` gọi hook một lần rồi đưa kết quả cho `SelectionPopup` (desktop, nằm trong cột nguyên văn) hoặc `SelectionDock` (mobile, nằm trong khối dính đáy ngay trên footer), chọn theo media query `DOCK_QUERY`. Logic thuần (chuẩn hoá chữ, đếm từ, URL từ điển, tính vị trí popup) ở `lib/selection.ts` để unit test.

**Tech Stack:** Next.js 16 · React 19 · Tailwind 3 · TypeScript · vitest + Testing Library (jsdom) · Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-touch-selection-design.md` (mockup `2026-11-05-touch-selection-mockup.html`)

## Global Constraints

- Màu chỉ dùng token trong `lib/theme.css` (class Tailwind `bg-surface`, `border-line`, `text-bright`, `text-accent`, `text-ink`…); cả theme sáng/tối; animation có `motion-reduce:`.
- Nút trên mobile cao ≥ 44px. Ngưỡng "tra nghĩa": **≤ 5 từ** (đếm theo khoảng trắng). Chờ vùng chọn đứng yên **250ms**.
- "Mobile" = `(max-width: 1023.98px), (pointer: coarse)`.
- Từ điển: `https://dictionary.cambridge.org/search/english/?q=<encodeURIComponent(text)>` mở tab mới (`"_blank", "noopener"`).
- Nhãn nút đúng chữ: `nghe`, `tra nghĩa`. Mẹo mobile đúng câu: `// mẹo: chạm "giải thích" để xem các cụm đáng học, giữ tay lên chữ để bôi đen và nghe phát âm`.
- Test trước, code sau; mỗi task một commit `feat:`/`test:`/`chore:`; `npm run verify` xanh trước khi báo xong.

## Review Focus

1. Vùng chọn bắt đầu trong nguyên văn nhưng kéo tràn sang bản dịch / chỗ khác → không hiện gì (cả hai đầu phải nằm trong cột nguyên văn). → test ở Task 2.
2. Vùng chọn chỉ có khoảng trắng / dấu câu, hoặc chọn qua nhiều dòng (có `\n`) → chữ gửi đi đã gộp khoảng trắng; rỗng thì không hiện. → test ở Task 1.
3. Chạm vào thanh/popup làm vùng chọn mất trước khi `click` tới (Safari iOS) → thanh vẫn nhận chạm (cơ chế `keep()`), chạm chỗ khác thì ẩn. → test ở Task 2.
4. Đang hiện thanh mà chuyển đoạn (chạm "tiếp →") → thanh ẩn, không đọc chữ của đoạn cũ. → test e2e ở Task 4.
5. Đổi cỡ cửa sổ / xoay máy qua 1024px khi đang chọn → chuyển giữa thanh và popup, không hiện cả hai. → test e2e ở Task 4.

---

### Task 1: Hàm thuần cho vùng chọn

**Files:**
- Create: `lib/selection.ts`
- Modify: `lib/breakpoints.ts` (thêm `DOCK_QUERY`)
- Test: `tests/selection.test.ts`

**Interfaces:**
- Produces:
  - `DOCK_QUERY = "(max-width: 1023.98px), (pointer: coarse)"` (trong `lib/breakpoints.ts`)
  - `normalizeSelectionText(raw: string): string` — gộp mọi khoảng trắng (kể cả `\n`) thành một dấu cách, trim; nếu không còn chữ/số nào (`/[\p{L}\p{N}]/u`) thì trả `""`.
  - `countWords(text: string): number`
  - `canLookUp(text: string): boolean` — `countWords(text) <= 5`
  - `lookupUrl(text: string): string`
  - `interface Box { left: number; top: number; width: number; height: number }`
  - `placePopup(a: { sel: Box; container: Box; popup: { width: number; height: number }; viewportWidth: number; minTop: number; gap?: number; margin?: number }): { left: number; top: number; below: boolean }` — mọi `Box` theo toạ độ viewport; kết quả theo toạ độ **trong container** (để đặt `position:absolute`). `gap` mặc định 10, `margin` mặc định 8.

- [ ] **Step 1: Viết test `tests/selection.test.ts`**

```ts
describe("normalizeSelectionText", () => {
  it("gộp khoảng trắng và xuống dòng", () => expect(normalizeSelectionText("  chronic\n  gambler ")).toBe("chronic gambler"));
  it("chỉ dấu câu / khoảng trắng → rỗng", () => expect(normalizeSelectionText(" , — . ")).toBe(""));
});
describe("canLookUp", () => {
  it("5 từ thì tra được", () => expect(canLookUp("look to sb for sth")).toBe(true)); // 5 từ
  it("6 từ thì không", () => expect(canLookUp("Charles Bukowski was an alcoholic, a")).toBe(false));
});
it("lookupUrl encode cụm", () =>
  expect(lookupUrl("one's worst days")).toBe("https://dictionary.cambridge.org/search/english/?q=one's%20worst%20days"));
describe("placePopup", () => {
  const base = { container: { left: 100, top: 200, width: 600, height: 400 }, popup: { width: 220, height: 46 }, viewportWidth: 1024, minTop: 52 };
  it("mặc định: canh giữa, phía trên vùng chọn cách 10px", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 400, width: 100, height: 24 } })).toEqual({ left: 140, top: 144, below: false }));
  it("sát mép trái màn hình: kẹp để mép trái popup = 8px viewport", () =>
    expect(placePopup({ ...base, container: { ...base.container, left: 0 }, sel: { left: 2, top: 400, width: 40, height: 24 } }).left).toBe(8));
  it("sát mép phải: mép phải popup = viewportWidth - 8", () => {
    const r = placePopup({ ...base, sel: { left: 990, top: 400, width: 30, height: 24 } });
    expect(base.container.left + r.left + 220).toBe(1016);
  });
  it("trên không đủ chỗ (dưới minTop) thì lật xuống dưới vùng chọn", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 70, width: 100, height: 24 } })).toEqual({ left: 140, top: -96, below: true }));
});
```

- [ ] **Step 2: Chạy `npx vitest run tests/selection.test.ts`** — Expected: FAIL (không tìm thấy `@/lib/selection`).
- [ ] **Step 3: Viết `lib/selection.ts` + thêm `DOCK_QUERY` vào `lib/breakpoints.ts`** (ghi chú JSDoc ngắn bằng tiếng Việt như các file lib khác).
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: selection helpers (normalize, word limit, dictionary url, popup placement)`

---

### Task 2: Hook `useTextSelection` + `useMediaQuery`

**Files:**
- Create: `lib/useTextSelection.ts`, `lib/useMediaQuery.ts`
- Test: `tests/useTextSelection.test.tsx`, `tests/useMediaQuery.test.tsx`

**Interfaces:**
- Consumes: `normalizeSelectionText` (Task 1).
- Produces:
  - `useMediaQuery(query: string): boolean` — `useSyncExternalStore`; server snapshot và môi trường không có `matchMedia` → `false`.
  - `interface TextSelection { text: string; rect: Box }` (rect = `getRangeAt(0).getBoundingClientRect()`, toạ độ viewport)
  - `useTextSelection(containerRef: RefObject<HTMLElement | null>, opts?: { settleMs?: number }): { selection: TextSelection | null; keep: () => void; clear: () => void }`

Hành vi (mỗi gạch là một test):
- `selectionchange` → chờ `settleMs` (mặc định 250) không có `selectionchange` mới thì mới đọc vùng chọn.
- Chỉ nhận khi **cả `anchorNode` và `focusNode`** nằm trong container và `normalizeSelectionText` khác rỗng; không thì `selection = null`.
- Chuột đang giữ (`pointerdown` với `pointerType === "mouse"`, nút trái) → không công bố; `pointerup` → đọc ngay (không chờ settle).
- `keep()`: trong 800ms kế tiếp, vùng chọn bị bỏ (collapsed) **không** xoá `selection` (để nút trên thanh kịp nhận click khi trình duyệt tự bỏ chọn lúc chạm).
- Đã có `selection` mà vùng chọn trống và có `pointerdown` ở ngoài thanh/popup (sau thời hạn `keep`) → `selection = null`.
- `clear()` → `selection = null` và `window.getSelection()?.removeAllRanges()`.
- Gỡ mọi listener / timer khi unmount.

- [ ] **Step 1: Viết test** dùng `vi.useFakeTimers()`, host component có `<p>` trong container và `<p data-testid="outside">` ngoài container; tạo Range bằng `document.createRange()` + `sel.addRange`, phát `document.dispatchEvent(new Event("selectionchange"))`; jsdom thiếu `Range.getBoundingClientRect` → gán stub trên `Range.prototype` trong `beforeAll`. Các ca:
  - `"chưa đủ 250ms thì chưa có; đủ 250ms thì có text 'chronic gambler'"`
  - `"anchor trong, focus ngoài container → null"`
  - `"chỉ chọn dấu câu → null"`
  - `"chuột đang giữ thì không công bố; pointerup thì công bố ngay"` (`new PointerEvent` không có trong jsdom → `Object.assign(new Event("pointerdown"), { pointerType: "mouse", button: 0 })`)
  - `"keep(): bỏ chọn trong 800ms vẫn giữ selection; pointerdown ngoài sau đó → null"`
  - `"clear() xoá selection và vùng chọn của trình duyệt"`
  - `useMediaQuery`: `"không có matchMedia → false"`, `"đổi matches + phát change → hook cập nhật"`.
- [ ] **Step 2: Chạy `npx vitest run tests/useTextSelection.test.tsx tests/useMediaQuery.test.tsx`** — Expected: FAIL (module chưa có).
- [ ] **Step 3: Viết hai hook.** Không gọi `setState` thẳng trong thân `useEffect` (luật `set-state-in-effect` sẽ được bật lại ở task backlog) — chỉ gọi trong callback của listener/timer.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: useTextSelection (selectionchange, settle, keep) and useMediaQuery hooks`

---

### Task 3: `SelectionActions`, `SelectionPopup`, `SelectionDock`

**Files:**
- Create: `components/reader/SelectionActions.tsx`, `components/reader/SelectionPopup.tsx`, `components/reader/SelectionDock.tsx`
- Test: `tests/selection-ui.test.tsx`

**Interfaces:**
- Consumes: `canLookUp`, `lookupUrl`, `placePopup`, `Box` (Task 1); `TextSelection` (Task 2); `speak`, `isSpeechAvailable` (`lib/speech.ts`).
- Produces:
  - `SelectionActions({ text, onKeep, size }: { text: string; onKeep: () => void; size: "popup" | "dock" })` — nút `nghe` (gọi `speak(text)`, disabled + `title="trình duyệt không hỗ trợ đọc"` khi `!isSpeechAvailable()`) và nút `tra nghĩa` (chỉ khi `canLookUp(text)`, `window.open(lookupUrl(text), "_blank", "noopener")`). Mỗi nút: `onPointerDown={onKeep}` và `onMouseDown={e => e.preventDefault()}` (giữ vùng chọn). Icon SVG ▶ (`var(--accent)`) và kính lúp (`var(--ink)`) lấy y nguyên từ `SpeechTooltip` cũ. `size="dock"` → nút `min-h-11`, viền `border-line`, nền `bg-bg` như mockup.
  - `SelectionPopup({ selection, containerRef, onKeep }: { selection: TextSelection; containerRef: RefObject<HTMLElement | null>; onKeep: () => void })` — `position:absolute` trong container; đo chính nó bằng `useLayoutEffect`, gọi `placePopup` với `viewportWidth = window.innerWidth`, `minTop = 52` (header desktop dính cao 44px + 8); trước khi đo xong thì `invisible`. `data-testid="selection-popup"`.
  - `SelectionDock({ selection, onKeep }: { selection: TextSelection; onKeep: () => void })` — khối trong luồng (không fixed), `border-t border-line bg-surface`, dòng 1 `"<text>"` một dòng `truncate`, dòng 2 là `SelectionActions size="dock"`. `data-testid="selection-dock"`, `role="toolbar"`, `aria-label="chữ đang chọn"`.

- [ ] **Step 1: Viết test `tests/selection-ui.test.tsx`** (mock `@/lib/speech`):
  - `"dock: hiện chữ trong ngoặc kép, bấm 'nghe' gọi speak với đúng chữ"`
  - `"dock: 6 từ → không có nút 'tra nghĩa'"`
  - `"'tra nghĩa' gọi window.open(lookupUrl(text), '_blank', 'noopener')"`
  - `"pointerdown trên nút gọi onKeep"`
  - `"speech không có → 'nghe' disabled"`
  - `"popup: render trong container với data-testid='selection-popup'"`
- [ ] **Step 2: Chạy `npx vitest run tests/selection-ui.test.tsx`** — Expected: FAIL.
- [ ] **Step 3: Viết 3 component.**
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: selection popup (desktop) and dock (mobile) components`

---

### Task 4: Gắn vào màn đọc + test nghiệm thu e2e

**Files:**
- Create: `e2e/selection.mobile.spec.ts` (tiêu chí 1–9 + Review Focus 4, 5), `e2e/selection.spec.ts` (tiêu chí 10–12)
- Modify: `components/reader/PassageView.tsx` (bỏ `<SpeechTooltip>` ở dòng ~176; gọi hook; render popup/dock), `components/reader/FirstTimeHint.tsx` (câu mẹo mobile), `e2e/mobile.spec.ts:94-101` (test "mẹo lần đầu không nhắc tô đen" → đổi thành có vế bôi đen, hoặc xoá vì tiêu chí 9 thay thế), `tests/passage-view.test.tsx` (nếu có kiểm SpeechTooltip)
- Delete: `components/reader/SpeechTooltip.tsx`, `tests/speech-tooltip.test.tsx`

**Interfaces:**
- Consumes: mọi thứ ở Task 1–3.

Gắn trong `PassageView`:
- `const { selection, keep, clear } = useTextSelection(originalColRef)`, `const docked = useMediaQuery(DOCK_QUERY)`.
- `const showSel = selection && drawerIndex === null` (tấm giải thích mở thì không hiện).
- Desktop (`!docked`): `<SelectionPopup>` ở chỗ `<SpeechTooltip>` cũ. Mobile (`docked`): `<SelectionDock>` là con **đầu tiên** của khối `sticky bottom-0` (trên `FirstTimeHint` và footer).
- Chuyển đoạn (`goTo`) → `clear()`.

Giả lập trong e2e (mobile project, `hasTouch`): tạo vùng chọn bằng `page.evaluate` (Range trên text node của `[data-testid="original-text"]` theo chuỗi con), vì Playwright không giả lập được giữ-để-bôi-đen. `addInitScript`: thay `speechSynthesis.speak` để đẩy `u.text` vào `window.__spoken`, thay `window.open` để ghi `window.__opened`.

- [ ] **Step 1: Viết `e2e/selection.mobile.spec.ts`**, mỗi tiêu chí một test, tên dạng "Khi … thì …":
  1. chọn "chronic gambler" → `selection-dock` hiện trong ≤ 500ms, chứa `"chronic gambler"`, có nút `nghe` + `tra nghĩa`; `selection-popup` count 0; đáy dock = đỉnh footer (±1px).
  2. bỏ chọn (`removeAllRanges` + chạm vào khoảng trống trang) → dock ẩn.
  3. chạm `nghe` → `window.__spoken` = `["chronic gambler"]`, dock vẫn hiện.
  4. chạm `tra nghĩa` → `window.__opened` = `lookupUrl("chronic gambler")`.
  5. chọn "Charles Bukowski was an alcoholic, a womanizer" → chỉ có `nghe`.
  6. chọn chữ trong `translation-col` → không có dock.
  7. 320px: dock trong bề ngang màn hình, không giao với nút footer nào, nút cao ≥ 44; chọn chữ dài → phần tử chữ `scrollWidth > clientWidth` (đang bị cắt "…") và cao một dòng.
  8. mở tấm giải thích (bật giải thích, chạm ghi chú 1) rồi chọn chữ trong nguyên văn → không có dock.
  9. mẹo lần đầu chứa `giữ tay lên chữ để bôi đen và nghe phát âm`.
  - RF4: dock đang hiện → chạm `tiếp →` → sang đoạn 2, dock ẩn.
  - (RF5 không đặt ở đây: máy giả lập mobile luôn là `pointer: coarse` nên ở mọi bề ngang đều là dock — RF5 nằm ở desktop spec bên dưới.)
- [ ] **Step 2: Viết `e2e/selection.spec.ts`** (desktop):
  10. `page.mouse.down` đầu chữ "chronic", `move` tới cuối "gambler", **trước khi thả** chờ 400ms → `selection-popup` count 0; `up` → popup hiện, đáy popup ở trên đỉnh vùng chọn.
  11. 1024×800: chọn từ đầu tiên của đoạn → hộp popup nằm trong `[0, 1024]`.
  12. chọn 6 từ → popup chỉ có `nghe`.
  - RF5: chọn ở 1280px → popup hiện; `setViewportSize(390, 844)` → popup mất, `selection-dock` hiện; không lúc nào có cả hai.
- [ ] **Step 3: Chạy `npx playwright test e2e/selection.mobile.spec.ts e2e/selection.spec.ts`** — Expected: FAIL (chưa gắn).
- [ ] **Step 4: Gắn vào `PassageView`, sửa `FirstTimeHint`, xoá `SpeechTooltip` + test cũ, sửa `e2e/mobile.spec.ts:94-101`.**
- [ ] **Step 5: Chạy lại 2 file e2e** — Expected: PASS.
- [ ] **Step 6: `npm run verify`** — Expected: tsc + lint sạch, mọi unit + e2e xanh.
- [ ] **Step 7: Commit** `feat: touch-friendly selection — dock on mobile, clamped popup on desktop`
