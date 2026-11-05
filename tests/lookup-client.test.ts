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
});
