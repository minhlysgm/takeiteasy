import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content")>();
  return { ...actual, getPassage: vi.fn(actual.getPassage) };
});
import { getPassage } from "@/lib/content";
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
  vi.mocked(getPassage).mockReset(); // mockReset trả về cài đặt gốc (getPassage thật)
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

  it("11 từ (có trong câu) → 400; 10 từ thì được", async () => {
    const eleven = "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a";
    expect(eleven.split(" ")).toHaveLength(11);
    expect((await handleLookup({ ...req, text: eleven }, deps())).status).toBe(400);
    const ten = "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler,";
    expect((await handleLookup({ ...req, text: ten }, deps())).status).toBe(200);
  });

  it("text > 120 ký tự → 400 (dù nằm trong câu và ≤ 10 từ)", async () => {
    const text = "x".repeat(121);
    const sentence = `a ${text} b`;
    vi.mocked(getPassage).mockReturnValue({ original: sentence } as ReturnType<typeof getPassage>);
    expect((await handleLookup({ ...req, text, sentence }, deps())).status).toBe(400);
    const ok = "x".repeat(120);
    vi.mocked(getPassage).mockReturnValue({ original: `a ${ok} b` } as ReturnType<typeof getPassage>);
    expect((await handleLookup({ ...req, text: ok, sentence: `a ${ok} b` }, deps())).status).toBe(200);
  });

  it("sentence > 600 ký tự → 400 (dù nằm trong đoạn)", async () => {
    const long = "lout " + "y".repeat(600);
    vi.mocked(getPassage).mockReturnValue({ original: long } as ReturnType<typeof getPassage>);
    expect((await handleLookup({ ...req, sentence: long }, deps())).status).toBe(400);
    const ok = "lout " + "y".repeat(595);
    expect(ok).toHaveLength(600);
    vi.mocked(getPassage).mockReturnValue({ original: ok } as ReturnType<typeof getPassage>);
    expect((await handleLookup({ ...req, sentence: ok }, deps())).status).toBe(200);
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

  it("store hỏng trước khi gọi ask (hit ném) → 503 error, không văng, không gọi ask", async () => {
    store.hit = vi.fn().mockRejectedValue(new Error("network"));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 503, body: { status: "unavailable", reason: "error" } });
    expect(ask).not.toHaveBeenCalled();
  });

  it("getCached / getSpentUsd ném → 503 error", async () => {
    store.getCached = vi.fn().mockRejectedValue(new Error("network"));
    expect((await handleLookup(req, deps())).body).toEqual({ status: "unavailable", reason: "error" });
    store = memoryStore();
    store.getSpentUsd = vi.fn().mockRejectedValue(new Error("network"));
    expect((await handleLookup(req, deps())).body).toEqual({ status: "unavailable", reason: "error" });
    expect(ask).not.toHaveBeenCalled();
  });

  it("setCached ném sau khi ask xong → vẫn 200 ok, tiền vẫn được cộng", async () => {
    store.setCached = vi.fn().mockRejectedValue(new Error("network"));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 200, body: { status: "ok", result: LOUT } });
    expect(await store.getSpentUsd()).toBeCloseTo(0.0002);
  });

  it("addSpentUsd ném sau khi ask xong → vẫn 200 ok và vẫn lưu cache", async () => {
    store.addSpentUsd = vi.fn().mockRejectedValue(new Error("network"));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 200, body: { status: "ok", result: LOUT } });
    expect(await store.getCached(cacheKey("lout", SENTENCE))).toEqual(LOUT);
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
    expect(k).toBe("lookup:v1:cache:" + createHash("sha256").update("lout\nx").digest("hex"));
    expect(cacheKey("lout", "x")).toBe(k);
    expect(cacheKey("lout", "y")).not.toBe(k);
  });
});
