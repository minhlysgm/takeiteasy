import "server-only";
import { Redis } from "@upstash/redis";
import type { LookupResult } from "@/lib/lookupTypes";

const HOUR_MS = 3_600_000;
const SPENT_KEY = "lookup:v1:spent_usd";

export interface LookupStore {
  getCached(key: string): Promise<LookupResult | null>;
  setCached(key: string, value: LookupResult, ttlSeconds: number): Promise<void>;
  getSpentUsd(): Promise<number>;
  addSpentUsd(usd: number): Promise<void>;
  /** Tăng bộ đếm của IP trong giờ hiện tại, trả số lượt sau khi tăng. */
  hit(ip: string, now: number): Promise<number>;
}

const hourOf = (now: number) => Math.floor(now / HOUR_MS);

/** Kho trong bộ nhớ tiến trình — dùng cho dev/test. */
export function memoryStore(): LookupStore {
  const cache = new Map<string, { value: LookupResult; expiresAt: number }>();
  const hits = new Map<string, number>();
  let spent = 0;
  return {
    async getCached(key) {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() >= entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },
    async setCached(key, value, ttlSeconds) {
      cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async getSpentUsd() {
      return spent;
    },
    async addSpentUsd(usd) {
      spent += usd;
    },
    async hit(ip, now) {
      const key = `${ip}:${hourOf(now)}`;
      const n = (hits.get(key) ?? 0) + 1;
      hits.set(key, n);
      return n;
    },
  };
}

/** Kho Upstash Redis (REST) — dùng khi chạy thật. */
export function upstashStore(url: string, token: string): LookupStore {
  const redis = new Redis({ url, token });
  return {
    async getCached(key) {
      return (await redis.get<LookupResult>(key)) ?? null;
    },
    async setCached(key, value, ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    },
    async getSpentUsd() {
      return Number(await redis.get<number | string>(SPENT_KEY)) || 0;
    },
    async addSpentUsd(usd) {
      await redis.incrbyfloat(SPENT_KEY, usd);
    },
    async hit(ip, now) {
      const key = `lookup:v1:rl:${ip}:${hourOf(now)}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 3600);
      return n;
    },
  };
}

let shared: LookupStore | null = null;

/** Có biến Upstash/KV → Upstash; không có: production → null (tạm ngưng), còn lại → một kho memory dùng chung. */
export function storeFromEnv(env: NodeJS.ProcessEnv): LookupStore | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return upstashStore(url, token);
  if (env.NODE_ENV === "production") return null;
  return (shared ??= memoryStore());
}
