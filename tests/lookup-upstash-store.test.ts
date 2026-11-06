import { describe, expect, it, vi } from "vitest";
import type { LookupResult } from "@/lib/lookupTypes";

// Client Redis giả trong bộ nhớ: ghi lại lệnh để kiểm khoá / ttl mà không gọi mạng.
const fake = vi.hoisted(() => {
  const data = new Map<string, unknown>();
  const ttl = new Map<string, number>();
  const calls: string[] = [];
  return { data, ttl, calls };
});
vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(readonly opts: { url: string; token: string }) {}
    async get(key: string) {
      fake.calls.push(`get ${key}`);
      return fake.data.has(key) ? fake.data.get(key) : null;
    }
    async set(key: string, value: unknown, opts?: { ex?: number }) {
      fake.calls.push(`set ${key}`);
      fake.data.set(key, value);
      if (opts?.ex) fake.ttl.set(key, opts.ex);
      return "OK";
    }
    async incrbyfloat(key: string, by: number) {
      const n = Number(fake.data.get(key) ?? 0) + by;
      fake.data.set(key, String(n)); // Upstash trả/giữ số thực dạng chuỗi
      return n;
    }
    async incr(key: string) {
      const n = Number(fake.data.get(key) ?? 0) + 1;
      fake.data.set(key, n);
      return n;
    }
    async expire(key: string, seconds: number) {
      fake.ttl.set(key, seconds);
      return 1;
    }
  },
}));

const { upstashStore } = await import("@/lib/server/lookupStore");

const RESULT: LookupResult = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "danh từ",
  meaning: "người thô lỗ",
  example: { en: "He was a lout.", vi: "Anh ta là kẻ thô lỗ." },
};
const HOUR = 3_600_000;

describe("upstashStore (client giả)", () => {
  it("cache: chưa có → null; set kèm ttl rồi lấy lại được", async () => {
    const store = upstashStore("https://x.upstash.io", "t");
    expect(await store.getCached("lookup:v1:cache:a")).toBeNull();
    await store.setCached("lookup:v1:cache:a", RESULT, 2_592_000);
    expect(await store.getCached("lookup:v1:cache:a")).toEqual(RESULT);
    expect(fake.ttl.get("lookup:v1:cache:a")).toBe(2_592_000);
  });

  it("tiền: chưa có → 0; cộng dồn số thực, đọc được cả khi Redis trả chuỗi", async () => {
    const store = upstashStore("https://x.upstash.io", "t");
    expect(await store.getSpentUsd()).toBe(0);
    await store.addSpentUsd(0.0002);
    await store.addSpentUsd(0.0003);
    expect(await store.getSpentUsd()).toBeCloseTo(0.0005);
    expect(fake.data.get("lookup:v1:spent_usd")).toBeTypeOf("string");
  });

  it("khoá tiền vẫn là lookup:v1:spent_usd (đổi khoá là reset ngân sách $9; chỉ cache mới lên v2)", async () => {
    const store = upstashStore("https://x.upstash.io", "t");
    await store.addSpentUsd(0.001);
    expect([...fake.data.keys()].filter((k) => k.includes("spent"))).toEqual(["lookup:v1:spent_usd"]);
  });

  it("lượt: tăng theo IP + giờ, chỉ đặt hạn 1 giờ ở lượt đầu, sang giờ sau đếm lại", async () => {
    const store = upstashStore("https://x.upstash.io", "t");
    const t = 7 * HOUR;
    expect(await store.hit("1.1.1.1", t)).toBe(1);
    expect(fake.ttl.get("lookup:v1:rl:1.1.1.1:7")).toBe(3600);
    fake.ttl.delete("lookup:v1:rl:1.1.1.1:7");
    expect(await store.hit("1.1.1.1", t + 1000)).toBe(2);
    expect(fake.ttl.has("lookup:v1:rl:1.1.1.1:7")).toBe(false);
    expect(await store.hit("2.2.2.2", t)).toBe(1);
    expect(await store.hit("1.1.1.1", t + HOUR)).toBe(1);
  });
});
