import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLookup } from "@/lib/lookupClient";
import type { LookupRequest, LookupResponse } from "@/lib/lookupTypes";

const REQ: LookupRequest = {
  bookId: "the-subtle-art",
  chapterId: "ch01",
  passageIndex: 1,
  text: "lout",
  sentence: "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout, a cheapskate, a deadbeat, and on his worst days, a poet.",
};
const OK: LookupResponse = {
  status: "ok",
  result: { headword: "lout", ipa: "/laʊt/", pos: "danh từ", meaning: "kẻ thô lỗ", example: { en: "Don't be a lout.", vi: "Đừng thô lỗ." } },
};
const UNAVAILABLE = { status: "unavailable", reason: "error" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.restoreAllMocks());

describe("fetchLookup", () => {
  it("200 → body; gửi POST /api/lookup JSON đúng request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(OK));
    await expect(fetchLookup(REQ)).resolves.toEqual(OK);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/lookup");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(REQ);
  });

  it("status 503 → unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ status: "unavailable", reason: "paused" }, 503));
    await expect(fetchLookup(REQ)).resolves.toEqual(UNAVAILABLE);
  });

  it("fetch reject (mạng lỗi) → unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchLookup(REQ)).resolves.toEqual(UNAVAILABLE);
  });

  it("200 nhưng JSON hỏng → unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not json{", { status: 200 }));
    await expect(fetchLookup(REQ)).resolves.toEqual(UNAVAILABLE);
  });

  it("200 nhưng thiếu kết quả → unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ status: "ok" }));
    await expect(fetchLookup(REQ)).resolves.toEqual(UNAVAILABLE);
  });

  it("bị abort → ném lại AbortError", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const ctrl = new AbortController();
    const p = fetchLookup(REQ, ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("quá 25 giây → unavailable, dù có signal của người gọi; trước 25 giây thì vẫn chờ", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      );
      for (const sig of [new AbortController().signal, undefined]) {
        let done = false;
        const p = fetchLookup(REQ, sig).finally(() => (done = true));
        await vi.advanceTimersByTimeAsync(24_999);
        expect(done).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await expect(p).resolves.toEqual(UNAVAILABLE);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("trình duyệt cũ không có AbortSignal.any / AbortSignal.timeout (Safari < 17.4) vẫn tra được và huỷ được", async () => {
    const any = Object.getOwnPropertyDescriptor(AbortSignal, "any");
    const timeout = Object.getOwnPropertyDescriptor(AbortSignal, "timeout");
    Object.defineProperty(AbortSignal, "any", { value: undefined, configurable: true });
    Object.defineProperty(AbortSignal, "timeout", { value: undefined, configurable: true });
    try {
      vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(json(OK)));
      await expect(fetchLookup(REQ, new AbortController().signal)).resolves.toEqual(OK);
      await expect(fetchLookup(REQ)).resolves.toEqual(OK);
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      );
      const ctrl = new AbortController();
      const p = fetchLookup(REQ, ctrl.signal);
      ctrl.abort();
      await expect(p).rejects.toMatchObject({ name: "AbortError" });
    } finally {
      if (any) Object.defineProperty(AbortSignal, "any", any);
      if (timeout) Object.defineProperty(AbortSignal, "timeout", timeout);
    }
  });

  it("signal người gọi đã huỷ từ trước → ném AbortError, không chờ", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) =>
      init?.signal?.aborted ? Promise.reject(new DOMException("aborted", "AbortError")) : Promise.resolve(json(OK)),
    );
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(fetchLookup(REQ, ctrl.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("signal gửi cho fetch gắn với signal người gọi (đang chờ mà huỷ → fetch thấy aborted)", async () => {
    let release!: (r: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => (release = r)));
    const ctrl = new AbortController();
    const p = fetchLookup(REQ, ctrl.signal);
    const sent = fetchSpy.mock.calls[0][1]?.signal as AbortSignal;
    expect(sent.aborted).toBe(false);
    ctrl.abort();
    expect(sent.aborted).toBe(true);
    release(json(OK));
    await p.catch(() => {});
  });
});
