import type { Page } from "@playwright/test";

// Giả lập phát audio cho e2e: không phát thật, ghi lại đường dẫn đã phát / số lần dừng,
// và giả speechSynthesis để kiểm đường lui về giọng trình duyệt.

export interface AudioSpy {
  played: string[];
  paused: number;
  spoken: string[];
  el: HTMLMediaElement | null;
  utter: SpeechSynthesisUtterance | null;
}

declare global {
  interface Window {
    __audio: AudioSpy;
  }
}

/**
 * `status` 200 (mặc định): `play()` và `src` được thay bằng bản giả, trình duyệt không tải file.
 * `status` 404: KHÔNG thay `play()` (trình duyệt thật tự từ chối) và file trả 404 → bộ phát lui về giọng trình duyệt.
 * `speech: false`: trình duyệt không có Web Speech (xoá `window.speechSynthesis`).
 */
export async function stubAudio(page: Page, opts: { status?: 200 | 404; speech?: boolean } = {}): Promise<void> {
  const status = opts.status ?? 200;
  await page.addInitScript(({ fake, speech }) => {
    const spy: AudioSpy = { played: [], paused: 0, spoken: [], el: null, utter: null };
    window.__audio = spy;
    if (fake) {
      // Chỉ ghi lại `src`, không cho trình duyệt tải: file rỗng sẽ bắn `error` thật và làm bộ phát lui về giọng máy.
      const srcs = new WeakMap<HTMLMediaElement, string>();
      Object.defineProperty(HTMLMediaElement.prototype, "src", {
        configurable: true,
        get(this: HTMLMediaElement) {
          return srcs.get(this) ?? "";
        },
        set(this: HTMLMediaElement, v: string) {
          srcs.set(this, v);
        },
      });
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        spy.played.push(new URL(this.src, location.href).pathname);
        spy.el = this;
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        spy.paused += 1;
      };
    }
    if (!speech) {
      // trình duyệt không có Web Speech
      // `speechSynthesis` là getter trên prototype: `delete` không xoá được, phải che bằng thuộc tính riêng
      Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
      return;
    }
    const fakeSynth = {
      cancel: () => {},
      getVoices: () => [],
      speak: (u: SpeechSynthesisUtterance) => {
        spy.spoken.push(u.text);
        spy.utter = u;
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: fakeSynth, configurable: true });
  }, { fake: status === 200, speech: opts.speech ?? true });
  // 200: `src` giả nên trình duyệt không tải file, không cần chặn mạng. 404: file thật trả lỗi.
  if (status === 404) await page.route("**/audio/**", (route) => route.fulfill({ status: 404, body: "" }));
}

/** Bắn `ended` lên phần tử audio đang phát. */
export async function endAudio(page: Page): Promise<void> {
  await page.evaluate(() => window.__audio.el?.dispatchEvent(new Event("ended")));
}

export async function played(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__audio.played);
}

export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__audio.spoken);
}

export async function pausedCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__audio.paused);
}
