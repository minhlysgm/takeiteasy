import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKey, handleLookup, type LookupDeps } from "@/lib/server/handleLookup";
import { memoryStore, type LookupStore } from "@/lib/server/lookupStore";
import type { LookupResult } from "@/lib/lookupTypes";

const LOUT: LookupResult = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "noun",
  meaning: "người thô lỗ, vụng về",
  example: { en: "Nobody invited the lout to dinner.", vi: "Không ai mời gã thô lỗ đó đi ăn tối." },
};
const SENTENCE =
  "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout, a cheapskate, a deadbeat, and on his worst days, a poet.";
const req = { bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 1, text: "lout", sentence: SENTENCE };
const HOUR = 3_600_000;

let store: LookupStore;
let ask: ReturnType<typeof vi.fn>;
const deps = (over: Partial<LookupDeps> = {}): LookupDeps => ({
  store,
  ask: ask as unknown as LookupDeps["ask"],
  ip: "1.2.3.4",
  budgetUsd: 9,
  now: 10 * HOUR,
  ...over,
});

beforeEach(() => {
  store = memoryStore();
  ask = vi.fn().mockResolvedValue({ result: LOUT, costUsd: 0.0002 });
});

describe("handleLookup", () => {
  it("hợp lệ → 200 ok", async () => {
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 200, body: { status: "ok", result: LOUT } });
    expect(ask).toHaveBeenCalledWith("lout", SENTENCE);
  });

  it("hình dạng sai → 400 invalid", async () => {
    for (const bad of [null, "x", {}, { ...req, passageIndex: "1" }, { ...req, text: 5 }, { ...req, text: "" }]) {
      const res = await handleLookup(bad, deps());
      expect(res).toEqual({ status: 400, body: { status: "unavailable", reason: "invalid" } });
    }
    expect(ask).not.toHaveBeenCalled();
  });

  it("câu không có trong đoạn → 400, không gọi ask", async () => {
    const res = await handleLookup({ ...req, sentence: "A lout is not here." }, deps());
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it("không tìm thấy đoạn → 400", async () => {
    expect((await handleLookup({ ...req, passageIndex: 9999 }, deps())).status).toBe(400);
    expect((await handleLookup({ ...req, bookId: "nope" }, deps())).status).toBe(400);
  });

  it("chữ tra không nằm trong câu → 400", async () => {
    const res = await handleLookup({ ...req, text: "banana" }, deps());
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it("11 từ → 400", async () => {
    const text = "a b c d e f g h i j k";
    const res = await handleLookup({ ...req, text }, deps());
    expect(res.status).toBe(400);
  });

  it("text > 120 ký tự hoặc sentence > 600 ký tự → 400", async () => {
    expect((await handleLookup({ ...req, text: "x".repeat(121) }, deps())).status).toBe(400);
    expect((await handleLookup({ ...req, sentence: SENTENCE + " ".repeat(10) + "x".repeat(600) }, deps())).status).toBe(400);
  });

  it("câu gửi lên có xuống dòng/khoảng trắng thừa vẫn hợp lệ", async () => {
    const messy = "  " + SENTENCE.replace(/, /g, ",\n  ") + "  ";
    const res = await handleLookup({ ...req, sentence: messy, text: " lout\n" }, deps());
    expect(res.status).toBe(200);
  });

  it("đã tiêu ≥ 9 → 503 paused, không gọi ask", async () => {
    await store.addSpentUsd(9);
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 503, body: { status: "unavailable", reason: "paused" } });
    expect(ask).not.toHaveBeenCalled();
  });

  it("lượt thứ 31 trong 1 giờ → 429, không gọi ask; sang giờ sau lại được", async () => {
    for (let i = 0; i < 30; i++) {
      // cache hit sau lần đầu: vẫn tính lượt
      expect((await handleLookup(req, deps())).status).toBe(200);
    }
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 429, body: { status: "unavailable", reason: "limited" } });
    expect(ask).toHaveBeenCalledTimes(1);
    expect((await handleLookup(req, deps({ now: 11 * HOUR }))).status).toBe(200);
  });

  it("lần 2 cùng chữ + câu → lấy cache, ask chỉ gọi 1 lần, tiền chỉ cộng 1 lần", async () => {
    await handleLookup(req, deps());
    const res = await handleLookup(req, deps());
    expect(res.status).toBe(200);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(await store.getSpentUsd()).toBeCloseTo(0.0002);
  });

  it("cache vẫn phục vụ khi đã hết ngân sách", async () => {
    await handleLookup(req, deps());
    await store.addSpentUsd(9);
    expect((await handleLookup(req, deps())).status).toBe(200);
  });

  it("sau lượt gọi AI, spent tăng đúng costUsd", async () => {
    await handleLookup(req, deps());
    expect(await store.getSpentUsd()).toBeCloseTo(0.0002);
  });

  it("ask ném 402 (hết credit) → 503 paused, không văng", async () => {
    ask.mockRejectedValue(Object.assign(new Error("credit"), { status: 402 }));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 503, body: { status: "unavailable", reason: "paused" } });
  });

  it("ask ném lỗi thường → 503 error, không văng", async () => {
    ask.mockRejectedValue(new Error("boom"));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 503, body: { status: "unavailable", reason: "error" } });
    expect(await store.getCached(cacheKey("lout", SENTENCE))).toBeNull();
  });

  it("lỗi mang costUsd → vẫn cộng tiền", async () => {
    ask.mockRejectedValue(Object.assign(new Error("bad json"), { costUsd: 0.001 }));
    await handleLookup(req, deps());
    expect(await store.getSpentUsd()).toBeCloseTo(0.001);
  });

  it("store hoặc ask null → 503 paused", async () => {
    const expected = { status: 503, body: { status: "unavailable", reason: "paused" } };
    expect(await handleLookup(req, deps({ store: null }))).toEqual(expected);
    expect(await handleLookup(req, deps({ ask: null }))).toEqual(expected);
  });
});

describe("cacheKey", () => {
  it("có tiền tố và ổn định", () => {
    const k = cacheKey("lout", "x");
    expect(k).toMatch(/^lookup:v1:cache:[0-9a-f]{64}$/);
    expect(cacheKey("lout", "x")).toBe(k);
    expect(cacheKey("lout", "y")).not.toBe(k);
  });
});
