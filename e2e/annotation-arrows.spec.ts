import { test, expect, type Page } from "@playwright/test";
import { markCardsSeen } from "./card-helpers";

// B1 (soi UI 2026-11-06): desktop bật "giải thích" — mũi tên ghi chú dừng sát mép cột mô tả, ngang đúng dòng có cụm,
// không bao giờ đi vào vùng chữ; ghi chú nằm ngang dòng đó, trong màn hình, không đè cột.

test.beforeEach(async ({ page }) => {
  await markCardsSeen(page);
});

interface Rect { left: number; right: number; top: number; bottom: number }
interface Measure {
  innerWidth: number;
  text: Rect;
  notes: { id: string; box: Rect; firstLine: Rect }[];
  arrows: { id: string; box: Rect; end: { x: number; y: number } }[];
  chunks: Record<string, Rect[]>;
}

/** Đo mọi ghi chú, mũi tên, cụm (theo từng dòng) và khung chữ mô tả, toạ độ màn hình. */
function measure(): Measure {
  const R = (r: DOMRect | Rect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  const reader = document.querySelector('[data-testid="reader"]')!;
  const svg = reader.querySelector<SVGSVGElement>('[data-testid="annotation-arrows"]')!;
  const s = svg.getBoundingClientRect();
  const notes = [...reader.querySelectorAll<HTMLElement>("[data-note-for]")]
    .filter((el) => el.tagName === "BUTTON")
    .map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return { id: el.dataset.noteFor!, box: R(el.getBoundingClientRect()), firstLine: R(range.getClientRects()[0]) };
    });
  const arrows = [...svg.querySelectorAll<SVGPathElement>("path[data-note-for]")].map((p) => {
    const n = p.getAttribute("d")!.trim().split(/[\s,]+/);
    return {
      id: p.dataset.noteFor!,
      box: R(p.getBoundingClientRect()),
      end: { x: s.left + Number(n[n.length - 2]), y: s.top + Number(n[n.length - 1]) },
    };
  });
  const chunks = Object.fromEntries(
    [...reader.querySelectorAll<HTMLElement>('[data-testid="caption-text"] [data-chunk-id]')].map((el) => [
      el.dataset.chunkId!,
      [...el.getClientRects()].filter((r) => r.width > 0).map(R),
    ]),
  );
  return {
    innerWidth: window.innerWidth,
    text: R(document.querySelector('[data-testid="caption-text"]')!.getBoundingClientRect()),
    notes,
    arrows,
    chunks,
  };
}

const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const mid = (r: Rect) => (r.top + r.bottom) / 2;

async function openExplain(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await page.keyboard.press("e");
  await expect(page.getByTestId("annotation-arrows").locator("path[data-note-for]").first()).toBeAttached();
}

const WIDTHS = [1024, 1280, 1440];

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const n of [1, 2, 3]) {
      test(`thẻ ${n}: mũi tên ngoài vùng chữ, chỉ vào đúng dòng có cụm; ghi chú ngang dòng, trong màn hình`, async ({ page }) => {
        await openExplain(page, `/read/the-subtle-art/ch01/${n}`);
        const m = await page.evaluate(measure);
        const ids = Object.keys(m.chunks);
        expect(m.notes.map((x) => x.id).sort()).toEqual([...ids].sort());
        expect(m.arrows.map((x) => x.id).sort()).toEqual([...ids].sort());

        for (const a of m.arrows) {
          // Đường mũi tên nằm hoàn toàn ngoài khung chữ mô tả (trái hoặc phải)
          expect(a.box.right <= m.text.left || a.box.left >= m.text.right, `${a.id}: mũi tên lấn vào chữ`).toBe(true);
          // Đầu mũi tên sát mép cột (6–14px) và nằm trong một dòng của cụm
          const gap = a.end.x < m.text.left ? m.text.left - a.end.x : a.end.x - m.text.right;
          expect(gap, `${a.id}: đầu mũi tên cách mép cột`).toBeGreaterThanOrEqual(6);
          expect(gap).toBeLessThanOrEqual(14);
          const lines = m.chunks[a.id];
          const target = lines.find((r) => a.end.y > r.top && a.end.y < r.bottom);
          expect(target, `${a.id}: đầu mũi tên không ngang dòng nào của cụm`).toBeTruthy();
          expect(Math.abs(a.end.y - mid(target!))).toBeLessThanOrEqual(2);
        }

        for (const note of m.notes) {
          // Trong màn hình, không đè khung chữ
          expect(note.box.left, `${note.id}: tràn trái`).toBeGreaterThanOrEqual(0);
          expect(note.box.right, `${note.id}: tràn phải`).toBeLessThanOrEqual(m.innerWidth);
          expect(overlaps(note.box, m.text), `${note.id}: ghi chú đè chữ`).toBe(false);
          // Dòng đầu ghi chú ngang dòng mũi tên chỉ tới (cùng phía với mũi tên)
          const a = m.arrows.find((x) => x.id === note.id)!;
          expect(Math.abs(mid(note.firstLine) - a.end.y), `${note.id}: ghi chú lệch dòng`).toBeLessThanOrEqual(6);
          const left = a.end.x < m.text.left;
          expect(left ? note.box.right <= a.end.x : note.box.left >= a.end.x).toBe(true);
        }
        // Ghi chú cùng lề không đè nhau
        for (const [i, p] of m.notes.entries())
          for (const q of m.notes.slice(i + 1)) expect(overlaps(p.box, q.box), `${p.id} đè ${q.id}`).toBe(false);
      });
    }
  });
}

test.describe("cụm xuống dòng", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("cụm bị ngắt sang dòng sau: mũi tên vẫn chỉ đúng một dòng của cụm, không chỉ vào khung bao hai dòng", async ({ page }) => {
    // Thu hẹp cột mô tả tới khi có cụm bị ngắt dòng (đo thật, không đoán chữ rơi vào đâu)
    await openExplain(page, "/read/the-subtle-art/ch01/1");
    let found: { m: Measure; id: string } | null = null;
    for (let w = 640; w >= 360 && !found; w -= 8) {
      await page.getByTestId("caption-text").evaluate(async (el, w) => {
        (el as HTMLElement).style.maxWidth = `${w}px`;
        window.dispatchEvent(new Event("resize"));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, w);
      const m = await page.evaluate(measure);
      const id = Object.keys(m.chunks).find((k) => m.chunks[k].length > 1);
      if (id) found = { m, id };
    }
    expect(found, "không tìm được bề ngang nào làm cụm xuống dòng").not.toBeNull();
    const { m, id } = found!;
    const a = m.arrows.find((x) => x.id === id)!;
    const [first, last] = [m.chunks[id][0], m.chunks[id][m.chunks[id].length - 1]];
    const onFirst = a.end.y > first.top && a.end.y < first.bottom;
    const onLast = a.end.y > last.top && a.end.y < last.bottom;
    // Lề trái ↔ dòng đầu của cụm, lề phải ↔ dòng cuối
    expect(a.end.x < m.text.left ? onFirst : onLast).toBe(true);
    const note = m.notes.find((x) => x.id === id)!;
    expect(Math.abs(mid(note.firstLine) - a.end.y)).toBeLessThanOrEqual(6);
  });
});
