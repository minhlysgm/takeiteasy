# Nhảy nhanh tới đoạn bất kỳ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bấm bộ đếm (desktop) / tiêu đề header (mobile) hoặc phím `g` để mở danh sách đoạn của chương (số, câu mở đầu, ✓ đã mở, đánh dấu đoạn đang đọc) và nhảy thẳng tới đoạn bất kỳ; `Home`/`End` về đoạn đầu/cuối.

**Architecture:** Logic thuần (câu mở đầu, ghi nhớ đoạn đã mở) ở `lib/`. `ChapterReader` (đã có đủ `passages`) tính `outline` rồi đưa xuống `PassageView`. Component mới `PassageJumpList` vẽ danh sách: desktop là ô nổi trên bộ đếm, mobile là tấm trượt từ dưới lên. Phần khoá cuộn / aria-modal / giữ Tab / trả focus của `ChunkDrawer` tách thành hook `useSheetBehavior` để cả hai dùng chung. `PassageView` giữ state `jumpOpen`, thêm phím `g`/`Home`/`End`.

**Tech Stack:** Next.js 16 · React 19 · Tailwind 3 · TypeScript · vitest + Testing Library (jsdom) · Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-passage-jump-design.md` (mockup `2026-11-05-jump-lookup-mockup.html`, phần "Việc A")

## Global Constraints

- Màu chỉ dùng token Tailwind trong `lib/theme.css` (`bg-surface`, `bg-bg`, `border-line`, `text-bright`, `text-muted`, `text-accent`, `bg-scrim`…); hiển thị đúng cả theme sáng/tối; mọi transition có `motion-reduce:transition-none`.
- Mốc mobile/desktop: `MOBILE_QUERY` / Tailwind `lg` (≥ 1024px là desktop).
- Vùng chạm mobile ≥ 44px; mỗi dòng danh sách cao ≥ 48px (`min-h-12`).
- Chữ hiển thị đúng: tiêu đề danh sách `Chương 1 · Don't Try` (chữ "Chương" viết hoa + `chapter.title`), dòng phụ `2/3 đoạn đã đọc`, nhãn đoạn hiện tại `đang đọc`, nút bộ đếm desktop `<Kbd>g</Kbd> chương 1 · 2/3 ▾`, tiêu đề mobile `chương 1 · đoạn 2/3 ▾`.
- localStorage key mới: `tie:read`. Mọi truy cập localStorage bọc try/catch (như `lib/progress.ts`).
- Test trước, code sau; mỗi task một commit `feat:`/`test:`/`chore:`/`refactor:`; `npm run verify` xanh trước khi báo xong.
- Ghi chú lệch spec có chủ đích: spec nói "tính câu mở đầu ở server"; `ChapterReader` là client component và đã nhận đủ `passages`, nên tính trong `ChapterReader` bằng `useMemo` (không tốn thêm dữ liệu truyền xuống).

## Review Focus

1. Danh sách đang mở mà người dùng nhấn ←/→/enter/e/s → phím tắt của màn đọc **không** được chạy (chỉ `g`/Esc đóng; ↑/↓/enter thuộc về danh sách). → test ở Task 4.
2. Danh sách đang mở rồi chuyển đoạn bằng back/forward của trình duyệt → danh sách tự đóng, không còn treo khoá cuộn trên `body`. → test ở Task 4.
3. `tie:read` hỏng (JSON sai, không phải mảng, có số âm/chuỗi) → coi như chưa đọc đoạn nào, không crash. → test ở Task 1.
4. Câu mở đầu không có dấu chấm (đoạn chỉ một câu cụt, hoặc dòng đầu kết thúc bằng xuống dòng) → lấy tới xuống dòng đầu tiên / hết đoạn; viết tắt kiểu "Mr. Smith" chấp nhận bị cắt (danh sách cắt "…" bằng CSS nên không vỡ giao diện). → test ở Task 1.
5. Đang bôi đen chữ thì mở danh sách → thanh/popup chọn chữ ẩn và vùng chọn bị bỏ (không đè lên tấm). → test ở Task 4.

---

### Task 1: Câu mở đầu + ghi nhớ đoạn đã mở

**Files:**
- Modify: `lib/content.ts` (thêm `firstSentence`, `PassageOutline`)
- Create: `lib/readPassages.ts`
- Test: `tests/content.test.ts` (thêm case), `tests/read-passages.test.ts`

**Interfaces:**
- Produces:
  - `interface PassageOutline { index: number; firstSentence: string }` (index 1-based) — trong `lib/content.ts`
  - `firstSentence(original: string): string` — lấy dòng đầu (trước `\n` đầu tiên), rồi cắt tới hết dấu `.`/`?`/`!` đầu tiên **có khoảng trắng hoặc hết chuỗi theo sau** (giữ cả dấu và dấu ngoặc kép đóng `"`/`”` nếu liền sau); không có thì trả cả dòng; luôn `trim()`.
  - `getReadPassages(bookId: string, chapterId: string): number[]` — sắp tăng dần, chỉ số nguyên ≥ 1.
  - `markPassageRead(bookId: string, chapterId: string, passageIndex: number): void` — không trùng lặp.
  - Lưu ở `localStorage["tie:read"]` dạng `Record<"<bookId>/<chapterId>", number[]>`.

- [ ] **Step 1: Viết test**

```ts
// tests/content.test.ts (thêm)
it("firstSentence: cắt tới dấu chấm đầu tiên", () => {
  expect(firstSentence("Bukowski wanted to be a writer. But for decades…")).toBe("Bukowski wanted to be a writer.");
  expect(firstSentence("See, despite the fame, he was a loser. He knew it.")).toBe("See, despite the fame, he was a loser.");
});
it("firstSentence: chỉ xét dòng đầu; không có dấu chấm thì lấy cả dòng", () => {
  expect(firstSentence("Which is why\n\nhe's the perfect place")).toBe("Which is why");
  expect(firstSentence("  no punctuation here  ")).toBe("no punctuation here");
});
it("firstSentence: giữ dấu hỏi/chấm than và ngoặc kép đóng", () => {
  expect(firstSentence('He said "Don\'t try." Then left.')).toBe('He said "Don\'t try."');
  expect(firstSentence("Why? Because.")).toBe("Why?");
});
it("firstSentence: dấu chấm giữa số không phải hết câu", () => {
  expect(firstSentence("It cost 3.5 dollars. Cheap.")).toBe("It cost 3.5 dollars.");
});
it("firstSentence của 3 đoạn ch01 khớp mockup", () => {
  const ps = getPassages("the-subtle-art", "ch01")!;
  expect(firstSentence(ps[1].original)).toBe("Bukowski wanted to be a writer.");
  expect(firstSentence(ps[2].original)).toBe("See, despite the book sales and the fame, Bukowski was a loser.");
});

// tests/read-passages.test.ts
beforeEach(() => localStorage.clear());
it("chưa có gì → []", () => expect(getReadPassages("b", "c")).toEqual([]));
it("mark rồi get, sắp xếp, không trùng, tách theo chương", () => {
  markPassageRead("b", "c", 2); markPassageRead("b", "c", 1); markPassageRead("b", "c", 2);
  markPassageRead("b", "other", 5);
  expect(getReadPassages("b", "c")).toEqual([1, 2]);
  expect(getReadPassages("b", "other")).toEqual([5]);
});
it("dữ liệu hỏng → [] và mark vẫn chạy", () => {
  localStorage.setItem("tie:read", "{oops");
  expect(getReadPassages("b", "c")).toEqual([]);
  markPassageRead("b", "c", 3);
  expect(getReadPassages("b", "c")).toEqual([3]);
  localStorage.setItem("tie:read", JSON.stringify({ "b/c": [1, "x", -2, 2.5, 4] }));
  expect(getReadPassages("b", "c")).toEqual([1, 4]);
});
it("localStorage ném lỗi → [] và không ném", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(getReadPassages("b", "c")).toEqual([]);
  expect(() => markPassageRead("b", "c", 1)).not.toThrow();
});
```

- [ ] **Step 2: Chạy `npx vitest run tests/content.test.ts tests/read-passages.test.ts`** — Expected: FAIL (chưa có `firstSentence`, module `@/lib/readPassages`).
- [ ] **Step 3: Viết `firstSentence` trong `lib/content.ts` và `lib/readPassages.ts`** theo Interfaces. Gợi ý regex cho câu: `/^.*?[.?!]["”]?(?=\s|$)/` trên dòng đầu.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: first-sentence outline + read-passage memory`

---

### Task 2: Tách `useSheetBehavior` khỏi `ChunkDrawer`

**Files:**
- Create: `lib/useSheetBehavior.ts`
- Modify: `components/reader/ChunkDrawer.tsx:27-31,57-93` (dùng hook thay code tại chỗ)
- Test: `tests/use-sheet-behavior.test.tsx`; `tests/chunk-drawer.test.tsx` phải xanh nguyên như cũ

**Interfaces:**
- Produces: `useSheetBehavior(ref: RefObject<HTMLElement | null>): { onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void }`
  - Lúc mount: focus `ref.current`; lúc unmount: trả focus về phần tử đang focus trước đó.
  - Khi `MOBILE_QUERY` khớp: `body.style.overflow = "hidden"` + `aria-modal="true"` trên `ref.current`; theo dõi `change` của media query; unmount thì trả `overflow` cũ.
  - `onKeyDown`: giữ Tab/Shift+Tab quanh quẩn trong `button:not(:disabled)` của `ref.current` khi `MOBILE_QUERY` khớp (y hệt `trapTab` hiện tại).

- [ ] **Step 1: Viết test** (`window.matchMedia` giả lập bằng `vi.fn` trả `{ matches, addEventListener, removeEventListener }`):
  - `it("mobile: khoá cuộn body + aria-modal, unmount thì trả lại")` — `body.style.overflow` `"hidden"` rồi về `""`; `aria-modal` là `"true"`.
  - `it("desktop: không khoá cuộn, không aria-modal")`.
  - `it("focus vào phần tử lúc mount, trả focus về nút cũ lúc unmount")`.
  - `it("mobile: Tab ở nút cuối quay về nút đầu; Shift+Tab ở nút đầu sang nút cuối")`.
- [ ] **Step 2: Chạy `npx vitest run tests/use-sheet-behavior.test.tsx`** — Expected: FAIL (chưa có module).
- [ ] **Step 3: Viết hook, rồi cho `ChunkDrawer` dùng nó** (`onKeyDown={sheet.onKeyDown}`), xoá code trùng.
- [ ] **Step 4: Chạy `npx vitest run tests/use-sheet-behavior.test.tsx tests/chunk-drawer.test.tsx`** — Expected: PASS cả hai.
- [ ] **Step 5: Commit** `refactor: extract useSheetBehavior from ChunkDrawer`

---

### Task 3: Component `PassageJumpList`

**Files:**
- Create: `components/reader/PassageJumpList.tsx`
- Test: `tests/passage-jump-list.test.tsx`

**Interfaces:**
- Consumes: `PassageOutline` (Task 1), `useSheetBehavior` (Task 2), `MOBILE_QUERY`.
- Produces:
```ts
interface Props {
  title: string;              // "Chương 1 · Don't Try"
  outline: PassageOutline[];
  current: number;            // 1-based
  read: number[];             // từ getReadPassages
  onPick: (index: number) => void;
  onClose: () => void;
}
export function PassageJumpList(props: Props): JSX.Element
```
- Cấu trúc DOM (test và e2e dựa vào):
  - Vùng phủ `data-testid="jump-backdrop"`: mobile `fixed inset-0 bg-scrim`; desktop `fixed inset-0` trong suốt. Bấm → `onClose`.
  - Khung `role="dialog"` `aria-label="danh sách đoạn"` `data-testid="jump-list"`, `tabIndex={-1}`: mobile `fixed inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl` trượt từ dưới (như ChunkDrawer, có `motion-reduce:transition-none`); desktop `lg:fixed lg:bottom-16 lg:right-[…]` rộng `lg:w-[420px]`, `lg:max-h-[60vh]`, đổ bóng, không trượt.
  - Đầu khung: tiêu đề + `{read.length}/{outline.length} đoạn đã đọc`; mobile có nút ✕ `aria-label="đóng"` (44×44).
  - Mỗi dòng là `<button data-testid="jump-row" data-index={i}>` cao `min-h-12`: số, câu mở đầu (`truncate`), `✓` (`aria-label="đã đọc"`) nếu `read.includes(i)`. Dòng hiện tại có `aria-current="true"`, nền accent nhạt (`bg-accent/10`) + viền trái accent + chữ `đang đọc`.
  - Desktop dưới cùng: gợi ý phím `↑ ↓ chọn · enter mở đoạn · esc đóng · home/end đoạn đầu/cuối` (dùng `Kbd`), `hidden lg:flex`.
- Hành vi: mở ra thì focus dòng hiện tại và `scrollIntoView({ block: "nearest" })`; ↑/↓ chuyển focus giữa các dòng (không vòng); enter/click → `onPick(i)`.

- [ ] **Step 1: Viết test**
  - `it("vẽ đủ dòng, câu mở đầu, ✓ đúng dòng đã đọc, aria-current ở dòng hiện tại")` — với outline 3 dòng, `current=2`, `read=[1,2]`: 3 `jump-row`; dòng 2 có `aria-current="true"` và chữ `đang đọc`; dòng 1,2 có `✓`, dòng 3 không; có chữ `2/3 đoạn đã đọc`.
  - `it("bấm dòng 1 → onPick(1)")`.
  - `it("focus dòng hiện tại lúc mở; ArrowUp sang dòng 1; ArrowDown ở dòng cuối giữ nguyên")`.
  - `it("bấm backdrop → onClose; bấm ✕ → onClose")`.
- [ ] **Step 2: Chạy `npx vitest run tests/passage-jump-list.test.tsx`** — Expected: FAIL.
- [ ] **Step 3: Viết component** theo Interfaces.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: PassageJumpList component`

---

### Task 4: Gắn vào màn đọc + phím tắt + e2e

**Files:**
- Modify: `components/reader/ChapterReader.tsx` (tính `outline`, truyền `chapterTitle` từ `book.chapters`)
- Modify: `components/reader/PassageView.tsx` — props mới, header mobile (:185-188), footer bộ đếm (:298), phím (:123-166), effect lưu tiến độ (:84-86)
- Test: `tests/passage-view.test.tsx` (thêm case), `e2e/passage-jump.spec.ts`, `e2e/passage-jump.mobile.spec.ts`

**Interfaces:**
- Consumes: `firstSentence`, `PassageOutline`, `getReadPassages`, `markPassageRead` (Task 1); `PassageJumpList` (Task 3).
- Produces: `PassageView` props thêm `outline: PassageOutline[]` và `chapterTitle: string`.
- Hành vi trong `PassageView`:
  - State `jumpOpen: boolean`; `read: number[]` (đọc lại bằng `getReadPassages` mỗi khi mở danh sách).
  - Effect lưu tiến độ gọi thêm `markPassageRead(book.id, chapterId, passageIndex)`.
  - Đổi đoạn (khối reset lúc vẽ ở :57-63) → `setJumpOpen(false)`.
  - Mở danh sách → `clearSelection()`.
  - Footer: `<span>` bộ đếm (:298) thành `<button data-testid="jump-trigger" aria-haspopup="dialog" aria-expanded={jumpOpen}>` gồm `<Kbd>g</Kbd> chương 1 · 2/3 ▾` (chỉ hiện ở `lg`).
  - Header mobile: khối tiêu đề (:185) thành `<button data-testid="jump-trigger-mobile">` cao `h-11`, `truncate`, thêm ` ▾`; ở `lg` vẫn là chữ thường như cũ (không bấm được).
  - Đóng danh sách → focus về đúng nút đã mở (do `useSheetBehavior` trả focus).
  - `onPick(i)` → `setJumpOpen(false)` rồi `goTo(i)` (`goTo` đã cuộn lên đầu).
  - Phím, chèn **trước** nhánh `drawerIndex !== null` giữ nguyên ưu tiên tấm giải thích:
    - tấm giải thích đang mở → `g`/`Home`/`End` không làm gì (đã có `return` trong nhánh drawer).
    - `jumpOpen` → chỉ `g` và `Escape` (đóng); mọi phím khác `return` (để ↑/↓/enter cho danh sách).
    - còn lại: `g` → mở; `Home` → `goTo(1)`; `End` → `goTo(passageCount)` (`preventDefault` để trang không tự cuộn).

- [ ] **Step 1: Viết unit test trong `tests/passage-view.test.tsx`** (theo cách file đó đang mock router):
  - `it("phím g mở danh sách, g lần nữa đóng")`.
  - `it("Home → router.push('/read/<book>/<ch>/1'); End → đoạn cuối")`.
  - `it("tấm giải thích đang mở: g/Home/End không làm gì")`.
  - `it("danh sách mở: ArrowRight/Enter/e không chuyển đoạn, không bật giải thích")`.
- [ ] **Step 2: Viết e2e `e2e/passage-jump.spec.ts`** (desktop 1440×900; dùng `dismissFirstTimeHint`, `finishTyping` từ `e2e/selection-helpers.ts`), mỗi `test` một tiêu chí của spec:
  1. Mở `/read/the-subtle-art/ch01/2`, bấm `jump-trigger` → 3 `jump-row`, dòng 2 `aria-current="true"`, dòng 2 chứa `Bukowski wanted to be a writer.`
  2. Bấm `jump-row[data-index="1"]` → URL kết thúc `/ch01/1`, `jump-list` ẩn, `original-text` chứa `Charles Bukowski`, `window.scrollY === 0`.
  3. Nhấn `g` → `jump-list` hiện; nhấn `g` → ẩn; nhấn `g` rồi `Escape` → ẩn và `jump-trigger` đang focus.
  4. Ở đoạn 2, nhấn `g`, `ArrowUp`, `Enter` → URL `/ch01/1`.
  5. Ở đoạn 2 nhấn `Home` → `/ch01/1`; nhấn `End` → `/ch01/3`.
  6. Mở tấm giải thích (`e` rồi bấm cụm đầu) → nhấn `g`/`Home`/`End` → URL không đổi, `jump-list` không có.
  7. Vào `/ch01/1` rồi `/ch01/2` (bằng nút "tiếp"), mở danh sách → dòng 1, 2 có `✓`, dòng 3 không; `page.reload()` rồi mở lại → vẫn vậy.
  8. Mở danh sách, bấm vào `original-col` → `jump-list` ẩn.
  - Review Focus 2: mở danh sách, `page.goBack()` → `jump-list` không có, `document.body.style.overflow` là `""`.
  - Review Focus 5: `selectText(page, "original-text", "chronic gambler", "selection-popup")`, nhấn `g` → `selection-popup` không có.
  - Tiêu chí 12: `page.emulateMedia({ reducedMotion: "reduce" })` → `getComputedStyle(jump-list).transitionDuration` là `"0s"`; đóng danh sách, nhấn `t` (đổi theme), mở lại → `html` có `data-theme` khác lúc đầu và `getComputedStyle(jump-list).backgroundColor` khác `"rgba(0, 0, 0, 0)"` và khác màu nền lúc trước khi đổi theme.
- [ ] **Step 3: Viết e2e `e2e/passage-jump.mobile.spec.ts`** (390×844):
  9. Chạm `jump-trigger-mobile` → `jump-list` hiện; chạm `jump-row[data-index="3"]` → URL `/ch01/3`, `jump-list` ẩn.
  10. Mở rồi chạm ✕ → ẩn; mở rồi chạm `jump-backdrop` ở góc trên → ẩn; khi đang mở `document.body.style.overflow === "hidden"`.
  11. Viewport 320×640: `jump-trigger-mobile` cao ≥ 44px, `scrollWidth <= clientWidth` (không tràn), một dòng (chiều cao < 2 × line-height); mỗi `jump-row` cao ≥ 44px.
- [ ] **Step 4: Chạy `npx vitest run tests/passage-view.test.tsx` và `npx playwright test e2e/passage-jump`** — Expected: FAIL (chưa gắn).
- [ ] **Step 5: Gắn `outline`/`chapterTitle` ở `ChapterReader` và mọi thay đổi trong `PassageView`** theo Interfaces.
- [ ] **Step 6: Chạy lại cả hai lệnh ở Step 4** — Expected: PASS.
- [ ] **Step 7: Chạy `npm run verify`** — Expected: tsc, eslint (0 cảnh báo), vitest, playwright đều xanh.
- [ ] **Step 8: Commit** `feat: jump to any passage (list, g/Home/End)`
