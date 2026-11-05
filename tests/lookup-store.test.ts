import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStore, storeFromEnv } from "@/lib/server/lookupStore";
import type { LookupResult } from "@/lib/lookupTypes";

const RESULT: LookupResult = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "noun",
  meaning: "người thô lỗ",
  example: { en: "He was a lout.", vi: "Anh ta là kẻ thô lỗ." },
};

afterEach(() => {
  vi.useRealTimers();
});

describe("memoryStore", () => {
  it("hit tăng dần trong cùng một giờ, tách theo IP, sang giờ sau đếm lại", async () => {
    const store = memoryStore();
    const t = 5 * 3_600_000;
    expect(await store.hit("1.1.1.1", t)).toBe(1);
    expect(await store.hit("1.1.1.1", t + 1000)).toBe(2);
    expect(await store.hit("2.2.2.2", t)).toBe(1);
    expect(await store.hit("1.1.1.1", t + 3_600_000)).toBe(1);
  });

  it("spent cộng dồn", async () => {
    const store = memoryStore();
    expect(await store.getSpentUsd()).toBe(0);
    await store.addSpentUsd(0.5);
    await store.addSpentUsd(0.25);
    expect(await store.getSpentUsd()).toBeCloseTo(0.75);
  });

  it("cache lấy lại được, hết hạn khi vượt ttl", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const store = memoryStore();
    await store.setCached("k", RESULT, 60);
    expect(await store.getCached("k")).toEqual(RESULT);
    vi.advanceTimersByTime(59_000);
    expect(await store.getCached("k")).toEqual(RESULT);
    vi.advanceTimersByTime(2_000);
    expect(await store.getCached("k")).toBeNull();
  });

  it("key chưa có → null", async () => {
    expect(await memoryStore().getCached("nope")).toBeNull();
  });
});

describe("storeFromEnv", () => {
  it("không có biến + production → null", () => {
    expect(storeFromEnv({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("không có biến + dev → memory dùng chung một instance", () => {
    const a = storeFromEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    const b = storeFromEnv({} as NodeJS.ProcessEnv);
    expect(a).not.toBeNull();
    expect(b).toBe(a);
  });

  it("có KV_REST_API_URL + TOKEN → store (không gọi mạng)", () => {
    const env = { NODE_ENV: "production", KV_REST_API_URL: "https://x.upstash.io", KV_REST_API_TOKEN: "t" };
    expect(storeFromEnv(env as unknown as NodeJS.ProcessEnv)).not.toBeNull();
  });

  it("có UPSTASH_REDIS_REST_URL + TOKEN → store", () => {
    const env = { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" };
    expect(storeFromEnv(env as unknown as NodeJS.ProcessEnv)).not.toBeNull();
  });
});
