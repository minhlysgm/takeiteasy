import { test, expect, type Page } from "@playwright/test";
import { getPassage } from "@/lib/content";
import { SKETCH_START_DELAY_MS, SKETCH_TOTAL_MS } from "@/lib/sketch/timeline";

const BOOK = "the-subtle-art";
const CH = "ch01";
const P1 = `/read/${BOOK}/${CH}/1`;
const PASSAGE_2 = getPassage(BOOK, CH, 2)!;

/** Bỏ qua hiệu ứng gõ chữ của bản dịch (click vào cột dịch = skip). */
async function finishTyping(page: Page) {
  await page.getByTestId("translation-col").click();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

/** Cuộn khung hình vào màn hình: hình chỉ vẽ khi đã lọt vào màn hình, đừng trông chờ vào chiều cao viewport. */
async function revealSketch(page: Page) {
  await page.getByTestId("sketch").locator("svg").scrollIntoViewIfNeeded();
}

async function startDrawing(page: Page) {
  await finishTyping(page);
  await revealSketch(page);
}

const SKETCH_1 = getPassage(BOOK, CH, 1)!.sketch!;

/** Nét và clip đang ra sao trên màn hình, đọc từ DOM thật. Chạy trong trang. */
function readArt() {
  const root = document.querySelector('[data-testid="sketch"]')!;
  return {
    strokes: Array.from(root.querySelectorAll<SVGPathElement>("svg path")).map((el) => {
      const cs = getComputedStyle(el);
      return { dasharray: cs.strokeDasharray, offset: parseFloat(cs.strokeDashoffset), dash: parseFloat(cs.strokeDasharray) };
    }),
    clips: Array.from(root.querySelectorAll("svg clipPath rect")).map((r) => ({
      x: Number(r.getAttribute("x")),
      y: Number(r.getAttribute("y")),
      width: Number(r.getAttribute("width")),
      height: Number(r.getAttribute("height")),
    })),
  };
}

/** Hình đầy đủ: không còn nét đứt nào, mọi clip chữ mở hết cỡ */
async function expectFullArt(page: Page) {
  await expect(page.getByTestId("sketch-art")).toHaveCSS("opacity", "1");
  const { strokes, clips } = await page.evaluate(readArt);
  expect(strokes.length).toBeGreaterThan(0);
  for (const s of strokes) {
    expect(s.dasharray).toBe("none");
    expect(s.offset).toBe(0);
  }
  const [x, y, w, h] = SKETCH_1.viewBox.split(/[\s,]+/).map(Number);
  expect(clips.length).toBe(SKETCH_1.steps.filter((s) => s.kind === "text").length);
  for (const c of clips) expect(c).toEqual({ x: x - w, y: y - h, width: w * 3, height: h * 3 });
}

// Mỗi test dùng context mới của Playwright nên localStorage `tie:sketch-seen:*` không rò giữa các test.
test.describe("phác thảo đoạn 1", () => {
  test("1. chờ bản dịch gõ xong thì mới vẽ", async ({ page }) => {
    await page.goto(P1);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", "waiting");
    await expect(sketch).toContainText("chờ bản dịch gõ xong…");
    await expect(page.getByText("đang gõ…")).toBeVisible();
    // Khung có mặt nhưng chưa thấy nét nào
    await expect(sketch).toBeVisible();
    await expect(page.getByTestId("sketch-art")).toHaveCSS("opacity", "0");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
  });

  test("2. gõ xong và hình trên màn hình thì bút chì vẽ rồi dừng ở done", async ({ page }) => {
    await page.goto(P1);
    await startDrawing(page);
    const sketch = page.getByTestId("sketch");
    await expect(page.getByTestId("sketch-pencil")).toBeVisible();
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 8000 });
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "↻ vẽ lại" })).toBeVisible();
  });

  const skips: [string, (page: Page) => Promise<void>][] = [
    ["bấm vào hình", (page) => page.getByRole("img", { name: /Charles Bukowski/ }).click()],
    ["bấm xem ngay", (page) => page.getByRole("button", { name: "xem ngay ⏭" }).click()],
  ];
  for (const [how, skip] of skips) {
    test(`3. ${how} khi đang vẽ thì hiện hết ngay`, async ({ page }) => {
      await page.goto(P1);
      await startDrawing(page);
      const sketch = page.getByTestId("sketch");
      await expect(sketch).toHaveAttribute("data-state", "drawing");
      await skip(page);
      await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 500 });
      await expectFullArt(page);
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    });
  }

  test("4. nút ↻ vẽ lại vẽ lại từ đầu", async ({ page }) => {
    await page.goto(P1);
    await startDrawing(page);
    const sketch = page.getByTestId("sketch");
    await page.getByRole("button", { name: "xem ngay ⏭" }).click();
    await expect(sketch).toHaveAttribute("data-state", "done");
    await expectFullArt(page);
    await expect(page.getByRole("button", { name: "↻ vẽ lại" })).toBeVisible();

    // Bấm và đọc trong cùng một lượt chạy của trang: rAF chưa kịp vẽ gì, nên đây đúng là lúc vừa xoá trắng
    const right = await page.evaluate((read) => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("vẽ lại"))!;
      btn.click();
      return new Function(`return (${read})()`)() as ReturnType<typeof readArt>;
    }, readArt.toString());
    expect(right.strokes.length).toBeGreaterThan(0);
    for (const s of right.strokes) {
      expect(s.offset).toBeGreaterThan(0);
      expect(s.offset).toBeCloseTo(s.dash, 2);
    }
    expect(right.clips.length).toBeGreaterThan(0);
    for (const c of right.clips) expect(c.width).toBe(0);

    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(page.getByTestId("sketch-art")).toHaveCSS("opacity", "1");
    await expect(page.getByTestId("sketch-pencil")).toBeVisible();
    // Rồi nét lại mọc dần từ đầu
    await expect
      .poll(async () => (await page.evaluate(readArt)).strokes.filter((s) => s.offset < s.dash - 0.01).length)
      .toBeGreaterThan(0);
    await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 8000 });
    await expectFullArt(page);
  });

  test("5. quay lại đoạn đã xem thì hình hiện sẵn, không vẽ lại", async ({ page }) => {
    await page.goto(P1);
    await startDrawing(page);
    await page.getByRole("button", { name: "xem ngay ⏭" }).click();
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
    await page.getByRole("button", { name: "← trước" }).click();
    await expect(page).toHaveURL(new RegExp(`/${CH}/1$`));
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
  });

  test("6. giảm chuyển động thì hình tĩnh, không bút chì, không nút vẽ lại", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(P1);
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "↻ vẽ lại" })).toHaveCount(0);
  });

  test.describe("7. Enter giữa lúc đang vẽ thì hiệu ứng cũ dừng, đoạn 2 theo luật của nó", () => {
    /** Vẽ dở đoạn 1 rồi Enter sang đoạn 2. Phải gõ xong trước: lúc đang gõ, Enter chỉ bỏ qua hiệu ứng gõ chứ không chuyển đoạn. */
    async function enterMidDraw(page: Page) {
      await page.goto(P1);
      await startDrawing(page);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
      // data-state nằm trên khung chung, nên chờ đúng hình đoạn 2 để không đọc nhầm trạng thái của hình cũ
      await expect(page.getByRole("img", { name: PASSAGE_2.sketch!.alt, exact: true })).toBeVisible();
    }

    test("đoạn 2 chưa xem: chờ bản dịch gõ xong rồi mới vẽ", async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (e) => errors.push(e));
      await enterMidDraw(page);
      const sketch = page.getByTestId("sketch");
      await expect(sketch).toHaveAttribute("data-state", "waiting");
      await expect(page.getByText("đang gõ…")).toBeVisible();
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
      // Chờ quá độ trễ bắt đầu vẽ: nếu đoạn 2 tưởng bản dịch đã gõ xong thì lúc này nó đã vẽ rồi.
      await page.waitForTimeout(SKETCH_START_DELAY_MS + 200);
      await expect(page.getByText("đang gõ…")).toBeVisible();
      await expect(sketch).toHaveAttribute("data-state", "waiting");
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
      await startDrawing(page);
      await expect(sketch).toHaveAttribute("data-state", "drawing");
      await expect(page.getByTestId("sketch-pencil")).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("đoạn 2 đã xem: hình hiện sẵn, không bút chì", async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (e) => errors.push(e));
      await page.addInitScript((id) => localStorage.setItem(`tie:sketch-seen:${id}`, "1"), PASSAGE_2.id);
      await enterMidDraw(page);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
      await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });

  test("8. bật giải thích thì hình mờ đi", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    await page.getByRole("button", { name: /giải thích/ }).click();
    await expect(page.getByTestId("sketch")).toHaveClass(/opacity-30/);
  });

  test("9. hình có mô tả cho trình đọc màn hình", async ({ page }) => {
    await page.goto(P1);
    await expect(page.getByRole("img", { name: /^Phác thảo: Charles Bukowski/ })).toBeVisible();
  });

  for (const n of [1, 2, 3]) {
    test(`10. nét vẽ SSR khớp client, không lỗi hydration (đoạn ${n})`, async ({ page }) => {
      const bad: string[] = [];
      page.on("console", (m) => m.type() === "error" && bad.push(m.text()));
      page.on("pageerror", (e) => bad.push(e.message));
      await page.goto(`/read/${BOOK}/${CH}/${n}`);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "waiting");
      expect(bad.filter((t) => /hydrat/i.test(t))).toEqual([]);
    });
  }
});

test.describe("12. chỉ vẽ khi hình đã lọt vào màn hình", () => {
  const readSeen = (page: Page) => page.evaluate((k) => localStorage.getItem(k), `tie:sketch-seen:${getPassage(BOOK, CH, 1)!.id}`);

  test("chưa lọt màn hình: chưa vẽ, báo cuộn xuống, chưa tính đã xem; cuộn tới thì vẽ", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 480 });
    await page.goto(P1);
    await finishTyping(page);
    const sketch = page.getByTestId("sketch");
    await expect(sketch.locator("svg")).not.toBeInViewport({ ratio: 0.9 });
    await expect(sketch).toContainText("cuộn xuống để xem vẽ…");
    await page.waitForTimeout(SKETCH_START_DELAY_MS + 300);
    await expect(sketch).toHaveAttribute("data-state", "waiting");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    expect(await readSeen(page)).toBeNull();

    await revealSketch(page);
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(sketch).not.toContainText("cuộn xuống để xem vẽ…");
    await expect(page.getByTestId("sketch-pencil")).toBeVisible();
  });

  test("đã bắt đầu thì cuộn đi vẫn vẽ tiếp tới xong", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 480 });
    await page.goto(P1);
    await startDrawing(page);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(sketch.locator("svg")).not.toBeInViewport({ ratio: 0.9 });
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 8000 });
    expect(await readSeen(page)).toBe("1");
  });
});

type DrawSample = {
  t: number;
  /** Trạng thái từng nét theo thứ tự trong DOM: F = xong, P = đang dở, H = chưa vẽ */
  order: string;
  /** Số đoạn con (M/m) của nét đang dở */
  partialSubpaths: number[];
  /** Khoảng cách từ đầu mực của nét đang dở tới mũi bút chì */
  tipGap: number | null;
};

/**
 * Ghi lại trạng thái nét ở MỌI khung hình đang vẽ, trên trình duyệt thật (đo bằng DOM + SVG thật).
 * Dùng đồng hồ giả của Playwright nên rAF nào cũng chạy đúng 16ms/lần, không phụ thuộc máy đang bận hay rảnh:
 * nhờ vậy bước vẽ ngắn (vòng khoanh, cầu thang) luôn có mẫu rơi vào giữa hình.
 */
async function sampleWholeDrawing(page: Page, url: string): Promise<{ samples: DrawSample[]; steps: (string | null)[] }> {
  await page.clock.install({ time: new Date("2026-11-05T00:00:00") });
  await page.goto(url);
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "waiting");
  await page.clock.pauseAt(new Date("2026-11-05T00:10:00"));
  await startDrawing(page);
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-testid="sketch"]')!;
    const out: DrawSample[] = [];
    (window as unknown as { __samples: DrawSample[] }).__samples = out;
    const tick = (now: number) => {
      if (root.dataset.state === "drawing") {
        const paths = Array.from(root.querySelectorAll<SVGPathElement>("svg path"));
        const partial: SVGPathElement[] = [];
        const order = paths
          .map((el) => {
            const len = parseFloat(el.style.strokeDasharray);
            const off = parseFloat(el.style.strokeDashoffset);
            if (off <= 0.01) return "F";
            if (off >= len - 0.01) return "H";
            partial.push(el);
            return "P";
          })
          .join("");
        let tipGap: number | null = null;
        if (partial.length === 1) {
          const el = partial[0];
          const ink = el.getPointAtLength(parseFloat(el.style.strokeDasharray) - parseFloat(el.style.strokeDashoffset));
          const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(root.querySelector('[data-testid="sketch-pencil"]')!.getAttribute("transform")!)!;
          tipGap = Math.hypot(ink.x - Number(m[1]), ink.y - Number(m[2]));
        }
        out.push({
          t: now,
          order,
          partialSubpaths: partial.map((el) => (el.getAttribute("d")!.match(/[Mm]/g) ?? []).length),
          tipGap,
        });
      }
      if (root.dataset.state !== "done") requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // Quan sát và độ trễ chạy nối nhau, nên tua từng chút tới khi hình bắt đầu vẽ
  await expect(async () => {
    await page.clock.runFor(100);
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing", { timeout: 100 });
  }).toPass();
  await page.clock.runFor(SKETCH_TOTAL_MS + 200);
  await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
  return page.evaluate(() => ({
    samples: (window as unknown as { __samples: DrawSample[] }).__samples,
    steps: Array.from(document.querySelectorAll('[data-testid="sketch"] svg path')).map((el) => el.getAttribute("data-step")),
  }));
}

test.describe("bút chì đi cùng đầu nét", () => {
  for (const n of [1, 3]) {
    test(`đoạn ${n}: mỗi lúc chỉ một nét đang dở, trước nó xong hết, sau nó chưa vẽ, bút ở đúng đầu nét`, async ({ page }) => {
      const { samples } = await sampleWholeDrawing(page, `/read/${BOOK}/${CH}/${n}`);
      const partial = samples.filter((s) => s.partialSubpaths.length > 0);
      expect(partial.length).toBeGreaterThan(50);
      // Một element có nhiều M thì trình duyệt cho mọi đoạn con mọc cùng lúc, trong khi bút chỉ đi từng đoạn
      expect(partial.filter((s) => s.partialSubpaths.some((c) => c !== 1))).toEqual([]);
      expect(samples.filter((s) => !/^F*P?H*$/.test(s.order))).toEqual([]);
      expect(partial.filter((s) => s.tipGap === null || s.tipGap > 0.2)).toEqual([]);
      // Vẫn gói trong đúng 5,6 giây dù số element tăng: một `d` vẫn là một bước
      const span = samples[samples.length - 1].t - samples[0].t;
      expect(Math.abs(span - SKETCH_TOTAL_MS)).toBeLessThanOrEqual(50); // sai số vài khung hình 16ms
    });
  }

  test("đoạn 3: cầu thang và vòng khoanh có mẫu ở giữa hình, không chỉ ở ranh giới giữa các nét", async ({ page }) => {
    const { samples, steps } = await sampleWholeDrawing(page, `/read/${BOOK}/${CH}/3`);
    const sketchSteps = getPassage(BOOK, CH, 3)!.sketch!.steps;
    const stairAt = sketchSteps.findIndex((s) => s.kind === "path" && s.d.startsWith("M30,226"));
    const ringAt = sketchSteps.findIndex((s) => s.kind === "ellipse" && s.multi);
    const slice = (order: string, key: string) => steps.flatMap((k, i) => (k === `${key}-0` ? [order[i]] : [])).join("");
    const stair = new Set(samples.map((s) => slice(s.order, `${stairAt}`)));
    const ring = new Set(samples.map((s) => slice(s.order, `${ringAt}`)));

    // Cầu thang nhiều đoạn: có lúc đoạn đầu xong, một đoạn đang dở, đoạn sau chưa vẽ
    expect([...stair].some((o) => /^F+PH+$/.test(o))).toBe(true);
    // Vòng khoanh 2 vòng: vòng 1 đang dở thì vòng 2 chưa có; vòng 2 đang dở thì vòng 1 đã xong
    expect(ring).toContain("PH");
    expect(ring).toContain("FP");
    expect(ring).not.toContain("PP");
  });
});
