import { describe, expect, it, vi } from "vitest";
import { MAX_RETRIES, retryDelay, withRetry429 } from "@/lib/audio/retry";

const res = (status: number, retryAfter?: string) =>
  new Response(null, { status, headers: retryAfter ? { "retry-after": retryAfter } : {} });

describe("retryDelay", () => {
  it("không có Retry-After → 2s, 4s, 8s", () => {
    expect([0, 1, 2].map((a) => retryDelay(a, null))).toEqual([2000, 4000, 8000]);
  });
  it("có Retry-After (giây) → theo đó, tối đa 60s", () => {
    expect(retryDelay(0, "5")).toBe(5000);
    expect(retryDelay(0, "600")).toBe(60000);
  });
  it("Retry-After lạ → như không có", () => {
    expect(retryDelay(1, "Wed, 21 Oct 2015")).toBe(4000);
    expect(retryDelay(0, "")).toBe(2000);
  });
});

describe("withRetry429", () => {
  const noSleep = () => Promise.resolve();
  it("429 rồi 200 → thử lại và trả 200", async () => {
    const request = vi.fn().mockResolvedValueOnce(res(429, "1")).mockResolvedValueOnce(res(200));
    const onWait = vi.fn();
    const out = await withRetry429(request, onWait, noSleep);
    expect(out.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(2);
    expect(onWait).toHaveBeenCalledWith(1000);
  });
  it("429 mãi → dừng sau MAX_RETRIES lần thử lại, trả 429", async () => {
    const request = vi.fn().mockImplementation(() => Promise.resolve(res(429)));
    const out = await withRetry429(request, () => {}, noSleep);
    expect(out.status).toBe(429);
    expect(request).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });
  it("lỗi khác (401) → không thử lại", async () => {
    const request = vi.fn().mockResolvedValue(res(401));
    expect((await withRetry429(request, () => {}, noSleep)).status).toBe(401);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
