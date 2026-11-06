import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const SENTENCE =
  "This is Charles Bukowski, and his life is a mess.";
const SECOND =
  "He drinks too much, bets his rent money on horse races, and the letters piling up on his desk all say the same thing: no thanks.";
const at = (text: string, sentence = SENTENCE) => {
  // cả hai câu nằm trong đoạn 1 của ch01: câu đầu mở đoạn, câu hai theo sau sau một dấu cách
  const start = (sentence === SENTENCE ? 0 : SENTENCE.length + 1) + sentence.indexOf(text);
  return { text, start, end: start + text.length };
};
const VALID = { bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 1, ...at("mess") };
const RESULT = {
  headword: "mess",
  ipa: "/mes/",
  pos: "danh từ",
  meaning: "mớ hỗn độn",
  example: { en: "My room is a mess.", vi: "Phòng tui bừa tung." },
};

const post = (body: unknown, ip?: string) =>
  new Request("http://localhost/api/lookup", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: ip ? { "x-forwarded-for": ip } : {},
  });

async function loadPost() {
  vi.resetModules(); // memory store dùng chung nằm ở module → reset để không rò đếm giữa các test
  return (await import("@/app/api/lookup/route")).POST;
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(RESULT) }],
    stop_reason: "end_turn",
    usage: { input_tokens: 1000, output_tokens: 1000 },
  });
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("LOOKUP_BUDGET_USD", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/lookup", () => {
  it("không có ANTHROPIC_API_KEY → 503 paused", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const POST = await loadPost();
    const res = await POST(post(VALID));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable", reason: "paused" });
    expect(create).not.toHaveBeenCalled();
  });

  it("production không có KV env → 503 paused", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const POST = await loadPost();
    const res = await POST(post(VALID));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable", reason: "paused" });
    expect(create).not.toHaveBeenCalled();
  });

  it("body không phải JSON → 400", async () => {
    const POST = await loadPost();
    const res = await POST(post("{oops"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ status: "unavailable", reason: "invalid" });
  });

  it("yêu cầu hợp lệ → 200 ok với kết quả từ Claude", async () => {
    const POST = await loadPost();
    const res = await POST(post(VALID, "9.9.9.9"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", result: RESULT });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("LOOKUP_BUDGET_USD không hợp lệ → dùng 9 (không fail-open)", async () => {
    vi.stubEnv("LOOKUP_BUDGET_USD", "abc");
    const POST = await loadPost();
    const res = await POST(post(VALID, "9.9.9.9"));
    expect(res.status).toBe(200);
  });

  it("LOOKUP_BUDGET_USD = 0 → paused", async () => {
    vi.stubEnv("LOOKUP_BUDGET_USD", "0");
    const POST = await loadPost();
    const res = await POST(post(VALID, "9.9.9.9"));
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("x-forwarded-for '1.2.3.4, 10.0.0.1' → giới hạn tính theo 1.2.3.4", async () => {
    const POST = await loadPost();
    const forwarded = "1.2.3.4, 10.0.0.1";
    // 31 cụm khác nhau trong câu (chưa có cache) — tra lại cụm đã có cache thì không trừ lượt
    const words = SECOND.split(" ");
    const texts = [...new Set(words.flatMap((_, i) => [words[i], words.slice(i, i + 2).join(" ")]))].slice(0, 31);
    expect(texts).toHaveLength(31);
    for (const text of texts.slice(0, 30)) expect((await POST(post({ ...VALID, ...at(text, SECOND) }, forwarded))).status).toBe(200);
    const res = await POST(post({ ...VALID, ...at(texts[30], SECOND) }, forwarded));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ status: "unavailable", reason: "limited" });
    // cùng IP đầu, proxy khác phía sau vẫn bị tính chung
    expect((await POST(post({ ...VALID, ...at(texts[30], SECOND) }, "1.2.3.4, 10.9.9.9"))).status).toBe(429);
    // IP khác thì không bị ảnh hưởng
    expect((await POST(post({ ...VALID, ...at(texts[30], SECOND) }, "5.6.7.8"))).status).toBe(200);
  });
});
