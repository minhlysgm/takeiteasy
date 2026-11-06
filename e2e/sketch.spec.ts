import { test, expect, type Page } from "@playwright/test";
import { getPassage } from "@/lib/content";
import { SKETCH_START_DELAY_MS, SKETCH_TOTAL_MS } from "@/lib/sketch/timeline";
import { markCardsSeen } from "./card-helpers";

const BOOK = "the-subtle-art";
const CH = "ch01";
const P1 = `/read/${BOOK}/${CH}/1`;
const PASSAGE_2 = getPassage(BOOK, CH, 2)!;

/** Bỏ qua hiệu ứng gõ chữ của bản dịch (click vào cột dịch = skip). Chỉ có tác dụng khi hình đã xong. */
async function finishTyping(page: Page) {
  // Hết "idle" tức là đã hydrate; bấm sớm hơn thì trang chưa kịp nghe
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
  await page.getByTestId("translation-col").click();
  await expect(page.getByText("đang gõ…")).toBeHidden();
}

/** Đã hydrate (hình rời "idle"). Thẻ vẽ trước: hình tự chạy, không chờ gì khác. */
async function hydrated(page: Page) {
  await expect(page.getByTestId("sketch")).not.toHaveAttribute("data-state", "idle");
}

/** Cuộn khung hình vào màn hình: hình chỉ vẽ khi đã lọt vào màn hình, đừng trông chờ vào chiều cao viewport. */
async function revealSketch(page: Page) {
  await page.getByTestId("sketch").locator("svg").scrollIntoViewIfNeeded();
}

async function startDrawing(page: Page) {
  await hydrated(page);
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
  test("1. mở thẻ là hình tự vẽ, không chờ bản dịch (bản dịch chờ hình)", async ({ page }) => {
    await page.goto(P1);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", /waiting|drawing/);
    await expect(sketch).not.toContainText("chờ bản dịch gõ xong…");
    await expect(page.getByText("đang gõ…")).toHaveCount(0);
    await expect(page.getByTestId("translation-waiting")).toBeVisible();
    // Khung có mặt; không chạm gì cả mà hình vẫn tự bắt đầu vẽ
    await expect(sketch).toBeVisible();
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(page.getByTestId("sketch-pencil")).toBeVisible();
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
    ["bấm vào hình", (page) => page.getByRole("img", { name: /^Một người đàn ông/ }).click()],
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
    await finishTyping(page); // vẽ xong thì bản dịch gõ; đang gõ thì Enter chỉ bỏ qua hiệu ứng gõ
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

  test.describe("7. sang đoạn 2 giữa lúc đang vẽ thì hiệu ứng cũ dừng, đoạn 2 theo luật của nó", () => {
    /** Vẽ dở đoạn 1 rồi bấm "tiếp →" sang đoạn 2. (Enter lúc đang vẽ chỉ hiện đủ hình, chưa chuyển đoạn.) */
    async function enterMidDraw(page: Page) {
      await page.goto(P1);
      await startDrawing(page);
      await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
      await page.getByRole("button", { name: "tiếp →" }).click();
      await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
      // data-state nằm trên khung chung, nên chờ đúng hình đoạn 2 để không đọc nhầm trạng thái của hình cũ
      await expect(page.getByRole("img", { name: PASSAGE_2.sketch!.alt, exact: true })).toBeVisible();
    }

    test("đoạn 2 chưa xem: vẽ lại từ đầu, mô tả + bản dịch chờ hình", async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (e) => errors.push(e));
      await enterMidDraw(page);
      const sketch = page.getByTestId("sketch");
      await expect(sketch).toHaveAttribute("data-state", /waiting|drawing/);
      await expect(page.getByTestId("caption-waiting")).toBeVisible();
      await expect(page.getByTestId("translation-waiting")).toBeVisible();
      await expect(page.getByText("đang gõ…")).toHaveCount(0);
      await startDrawing(page);
      await expect(sketch).toHaveAttribute("data-state", "drawing");
      await expect(page.getByTestId("sketch-pencil")).toBeVisible();
      await expect(page.getByTestId("caption-waiting")).toBeVisible();
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

  test("7. rời đoạn lúc đang vẽ thì đoạn đó chưa tính là đã xem", async ({ page }) => {
    await page.goto(P1);
    await startDrawing(page);
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
    await page.getByRole("button", { name: "tiếp →" }).click();
    await expect(page).toHaveURL(new RegExp(`/${CH}/2$`));
    await expect(page.getByRole("img", { name: PASSAGE_2.sketch!.alt, exact: true })).toBeVisible();
    const key = `tie:sketch-seen:${getPassage(BOOK, CH, 1)!.id}`;
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
    // Quay lại đoạn 1: vẫn được xem hiệu ứng, không hiện sẵn
    await page.getByRole("button", { name: "← trước" }).click();
    await expect(page).toHaveURL(new RegExp(`/${CH}/1$`));
    await expect(page.getByRole("img", { name: /^Một người đàn ông/ })).toBeVisible();
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", /waiting|drawing/);
    await expect(page.getByTestId("caption-waiting")).toBeVisible();
  });

  test("9. bật giải thích thì hình mờ đi", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    await page.getByRole("button", { name: /giải thích/ }).click();
    await expect(page.getByTestId("sketch")).toHaveClass(/opacity-30/);
  });

  test("10. hình có mô tả cho trình đọc màn hình", async ({ page }) => {
    await page.goto(P1);
    await expect(page.getByRole("img", { name: /^Một người đàn ông/ })).toBeVisible();
  });

  for (const n of [1, 2, 3]) {
    test(`nét vẽ SSR khớp client, không lỗi hydration (đoạn ${n})`, async ({ page }) => {
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

  // Hình nằm đầu cột trái: cửa sổ phải thấp hơn hẳn hình (~320px) thì mới có lúc hình chưa lọt màn hình.
  // Không chạm phím / chuột nào: lúc hình chưa xong, phím bất kỳ là "hiện đủ ngay".
  test("chưa lọt màn hình: chưa vẽ, báo cuộn tới hình, chưa tính đã xem; cuộn tới thì vẽ", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 300 });
    await page.goto(P1);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", "waiting");
    await expect(sketch.locator("svg")).not.toBeInViewport({ ratio: 0.9 });
    await expect(sketch).toContainText("cuộn tới hình để xem vẽ…");
    await page.waitForTimeout(SKETCH_START_DELAY_MS + 300);
    await expect(sketch).toHaveAttribute("data-state", "waiting");
    await expect(page.getByTestId("sketch-pencil")).toHaveCount(0);
    expect(await readSeen(page)).toBeNull();

    await revealSketch(page);
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(sketch).not.toContainText("cuộn tới hình để xem vẽ…");
    await expect(page.getByTestId("sketch-pencil")).toBeVisible();
  });

  test("đã bắt đầu thì cuộn đi vẫn vẽ tiếp tới xong", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 300 });
    await page.goto(P1);
    await startDrawing(page);
    const sketch = page.getByTestId("sketch");
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(sketch.locator("svg")).not.toBeInViewport({ ratio: 0.9 });
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    await expect(sketch).toHaveAttribute("data-state", "done", { timeout: 8000 });
    expect(await readSeen(page)).toBe("1");
  });
});

test.describe("Enter trên nút đang focus chỉ làm đúng việc của nút", () => {
  const url = (n: number) => new RegExp(`/${CH}/${n}$`);

  test("↻ vẽ lại: vẽ lại, không chuyển đoạn", async ({ page }) => {
    await page.addInitScript((id) => localStorage.setItem(`tie:sketch-seen:${id}`, "1"), getPassage(BOOK, CH, 1)!.id);
    await page.goto(P1);
    await finishTyping(page);
    await page.getByRole("button", { name: "↻ vẽ lại" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
    await page.waitForTimeout(200);
    await expect(page).toHaveURL(url(1));
  });

  test("xem ngay: hiện hết, không chuyển đoạn", async ({ page }) => {
    await page.goto(P1);
    await startDrawing(page);
    await page.getByRole("button", { name: "xem ngay ⏭" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "done");
    // cùng một nút đổi nhãn: focus không rơi về <body>, Enter lần nữa là vẽ lại
    await expect(page.getByRole("button", { name: "↻ vẽ lại" })).toBeFocused();
    await page.waitForTimeout(200);
    await expect(page).toHaveURL(url(1));
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("sketch")).toHaveAttribute("data-state", "drawing");
  });

  test("giải thích: bật đúng một lần, không chuyển đoạn", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    await page.getByRole("button", { name: /giải thích/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("header")).toContainText("explain");
    await page.waitForTimeout(200);
    await expect(page).toHaveURL(url(1));
    await page.keyboard.press("Enter");
    await expect(page.locator("header")).not.toContainText("explain");
  });

  test("theme: đổi đúng một lần, không chuyển đoạn", async ({ page }) => {
    await page.goto(P1);
    await finishTyping(page);
    const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
    const before = await theme();
    await page.getByRole("button", { name: /theme/ }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(theme).not.toBe(before);
    await page.waitForTimeout(200);
    await expect(page).toHaveURL(url(1));
  });

  for (const name of [/đoạn tiếp/, /tiếp →/]) {
    test(`${name.source}: sang đúng đoạn sau, một lần`, async ({ page }) => {
      await page.goto(P1);
      await finishTyping(page);
      await page.evaluate(() => {
        (window as unknown as { __pushes: number }).__pushes = 0;
        const push = history.pushState.bind(history);
        history.pushState = (...args) => {
          (window as unknown as { __pushes: number }).__pushes++;
          push(...args);
        };
      });
      await page.getByRole("button", { name }).focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(url(2));
      await page.waitForTimeout(200);
      await expect(page).toHaveURL(url(2));
      expect(await page.evaluate(() => (window as unknown as { __pushes: number }).__pushes)).toBe(1);
    });
  }

  for (const name of [/giải thích/, /theme/]) {
    test(`bấm chuột vào ${name.source} rồi Enter: Enter sang đoạn sau`, async ({ page }) => {
      await markCardsSeen(page); // hình chưa xong thì Enter là "hiện đủ ngay", không phải việc của test này
      await page.goto(P1);
      await finishTyping(page);
      await page.getByRole("button", { name }).click();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(url(2));
    });
  }

  test("← trước: về đúng đoạn trước, một lần", async ({ page }) => {
    await page.goto(`/read/${BOOK}/${CH}/2`);
    await finishTyping(page);
    await page.getByRole("button", { name: "← trước" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(url(1));
    await page.waitForTimeout(200);
    await expect(page).toHaveURL(url(1));
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
  /** Bút chì trùi lên hàng tiêu đề "// hình" bao nhiêu px (≤ 0 là không chạm) */
  pencilOverHeader: number;
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
        const header = root.firstElementChild!.getBoundingClientRect();
        const pen = root.querySelector('[data-testid="sketch-pencil"]')!.getBoundingClientRect();
        out.push({
          pencilOverHeader: header.bottom - pen.top,
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
      // Thân bút không che hàng tiêu đề, kể cả khi vẽ sát mép trên hình
      expect(Math.max(...samples.map((s) => s.pencilOverHeader))).toBeLessThanOrEqual(0);
      // Vẫn gói trong đúng 6 giây dù số element tăng: một `d` vẫn là một bước
      const span = samples[samples.length - 1].t - samples[0].t;
      expect(Math.abs(span - SKETCH_TOTAL_MS)).toBeLessThanOrEqual(50); // sai số vài khung hình 16ms
    });
  }

  test("đoạn 3: nét nhiều đoạn con (mặt ghế đá + chân) có mẫu ở giữa hình, không chỉ ở ranh giới giữa các nét", async ({ page }) => {
    const { samples, steps } = await sampleWholeDrawing(page, `/read/${BOOK}/${CH}/3`);
    const sketchSteps = getPassage(BOOK, CH, 3)!.sketch!.steps;
    const stairAt = sketchSteps.findIndex((s) => s.kind === "path" && s.d.startsWith("M360 250 L482 250"));
    const slice = (order: string, key: string) => steps.flatMap((k, i) => (k === `${key}-0` ? [order[i]] : [])).join("");
    const stair = new Set(samples.map((s) => slice(s.order, `${stairAt}`)));

    expect(stairAt).toBeGreaterThanOrEqual(0);
    // Nét nhiều đoạn con: có lúc đoạn đầu xong, một đoạn đang dở, đoạn sau chưa vẽ
    expect([...stair].some((o) => /^F+PH+$/.test(o))).toBe(true);
    // (Vòng khoanh `multi` chưa có thẻ nào dùng nên chưa có phép đo "vẽ đủ ~1,2 giây" ở đây.)
  });
});

test.describe("mobile 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hàng tiêu đề hình không vỡ chữ, hình không xê dịch khi bắt đầu vẽ và khi vẽ xong", async ({ page }) => {
    await page.goto(P1);
    const sketch = page.getByTestId("sketch");
    // Hình nằm đầu trang: không chạm gì, hình tự vẽ
    await expect(sketch).toHaveAttribute("data-state", "waiting");
    const svg = sketch.locator("svg");
    const label = sketch.getByText("// hình");
    const lines = () => label.evaluate((el) => el.getClientRects().length);
    const box = async () => {
      const b = (await svg.boundingBox())!;
      return [Math.round(b.x), Math.round(b.width)];
    };
    const before = await box(); // lúc còn chờ (hoặc vừa bắt đầu vẽ)
    await svg.scrollIntoViewIfNeeded();
    await expect(sketch).toHaveAttribute("data-state", "drawing");
    expect(await box()).toEqual(before);
    expect(await lines()).toBe(1);
    const skip = sketch.getByRole("button", { name: "xem ngay ⏭" });
    expect(await skip.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThan(24); // một dòng
    await skip.click();
    await expect(sketch).toHaveAttribute("data-state", "done");
    expect(await box()).toEqual(before);
    expect(await lines()).toBe(1);
  });
});
