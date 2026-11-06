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
const P1 = getPassage("the-subtle-art", "ch01", 1)!.caption;
/** Chữ tra + vị trí của nó trong nguyên văn (lần xuất hiện đầu, hoặc cuối nếu `last`). */
const at = (text: string, caption = P1, last = false) => {
  const start = last ? caption.lastIndexOf(text) : caption.indexOf(text);
  return { text, start, end: start + text.length };
};
const req = { bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 1, ...at("lout") };
const mockCaption = (caption: string) =>
  vi.mocked(getPassage).mockReturnValue({ caption } as ReturnType<typeof getPassage>);
const HOUR = 3_600_000;

let store: LookupStore;
let errorLog: ReturnType<typeof vi.spyOn>;
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
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
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
    for (const bad of [
      null,
      "x",
      {},
      { ...req, passageIndex: "1" },
      { ...req, text: 5 },
      { ...req, text: "" },
      { ...req, start: "1" },
      { ...req, start: 1.5 },
      { ...req, end: undefined },
    ]) {
      const res = await handleLookup(bad, deps());
      expect(res).toEqual({ status: 400, body: { status: "unavailable", reason: "invalid" } });
    }
    expect(ask).not.toHaveBeenCalled();
  });

  it("server tự cắt câu theo vị trí; chữ có ở 2 câu thì lấy đúng câu của vị trí đó", async () => {
    const caption = "I met a lout at the bar.\nLater he was a lout again.";
    mockCaption(caption);
    await handleLookup({ ...req, ...at("lout", caption, true) }, deps());
    expect(ask).toHaveBeenLastCalledWith("lout", "Later he was a lout again.");
    await handleLookup({ ...req, ...at("lout", caption) }, deps());
    expect(ask).toHaveBeenLastCalledWith("lout", "I met a lout at the bar.");
  });

  it("vị trí không khớp chữ tra hoặc ra ngoài đoạn → 400, không gọi ask", async () => {
    const cheap = at("a cheapskate");
    for (const bad of [
      { ...req, start: cheap.start, end: cheap.end },
      { ...req, start: -1, end: 3 },
      { ...req, start: P1.length - 2, end: P1.length + 2 },
      { ...req, start: req.end, end: req.start },
    ]) {
      expect((await handleLookup(bad, deps())).status).toBe(400);
    }
    expect(ask).not.toHaveBeenCalled();
  });

  it("bôi đen giữa từ hoặc kèm dấu câu vẫn tra được, giữ nguyên chữ đã chọn", async () => {
    expect((await handleLookup({ ...req, ...at("gamble") }, deps())).status).toBe(200);
    expect(ask).toHaveBeenLastCalledWith("gamble", SENTENCE);
    expect((await handleLookup({ ...req, ...at("lout,") }, deps())).status).toBe(200);
    expect(ask).toHaveBeenLastCalledWith("lout,", SENTENCE);
  });

  it("chữ gửi lên có xuống dòng/khoảng trắng thừa vẫn khớp vị trí", async () => {
    const res = await handleLookup({ ...req, text: " lout\n" }, deps());
    expect(res.status).toBe(200);
    expect(ask).toHaveBeenCalledWith("lout", SENTENCE);
  });

  it("chữ tra chỉ toàn dấu câu → 400", async () => {
    expect((await handleLookup({ ...req, ...at(", ") }, deps())).status).toBe(400);
  });

  it("không tìm thấy đoạn → 400", async () => {
    expect((await handleLookup({ ...req, passageIndex: 9999 }, deps())).status).toBe(400);
    expect((await handleLookup({ ...req, bookId: "nope" }, deps())).status).toBe(400);
  });

  it("chữ tra khác chữ ở vị trí gửi lên → 400", async () => {
    const res = await handleLookup({ ...req, text: "banana" }, deps());
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it("11 từ → 400; 10 từ thì được", async () => {
    const eleven = "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a";
    expect(eleven.split(" ")).toHaveLength(11);
    expect((await handleLookup({ ...req, ...at(eleven) }, deps())).status).toBe(400);
    const ten = "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler,";
    expect((await handleLookup({ ...req, ...at(ten) }, deps())).status).toBe(200);
  });

  it("text > 120 ký tự → 400 (dù ≤ 10 từ); đúng 120 thì được", async () => {
    const long = "x".repeat(121);
    mockCaption(`a ${long} b`);
    expect((await handleLookup({ ...req, ...at(long, `a ${long} b`) }, deps())).status).toBe(400);
    const ok = "x".repeat(120);
    mockCaption(`a ${ok} b`);
    expect((await handleLookup({ ...req, ...at(ok, `a ${ok} b`) }, deps())).status).toBe(200);
  });

  it("câu dài quá 600 ký tự → server gửi AI khung ≤ 600 ký tự quanh chữ tra", async () => {
    const caption = "word ".repeat(150) + "lout " + "word ".repeat(150);
    mockCaption(caption);
    expect((await handleLookup({ ...req, ...at("lout", caption) }, deps())).status).toBe(200);
    const sentence = ask.mock.calls[0][1] as string;
    expect(sentence.length).toBeLessThanOrEqual(600);
    expect(sentence).toContain("lout");
  });

  it("đã tiêu ≥ 9 → 503 paused, không gọi ask", async () => {
    await store.addSpentUsd(9);
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 503, body: { status: "unavailable", reason: "paused" } });
    expect(ask).not.toHaveBeenCalled();
  });

  it("lượt thứ 31 (chưa có cache) trong 1 giờ → 429, không gọi ask; sang giờ sau lại được", async () => {
    for (let i = 0; i < 30; i++) {
      await store.hit(deps().ip, deps().now);
    }
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 429, body: { status: "unavailable", reason: "limited" } });
    expect(ask).not.toHaveBeenCalled();
    expect((await handleLookup(req, deps({ now: 11 * HOUR }))).status).toBe(200);
  });

  it("tra lại chữ đã có cache không bị tính lượt (40 lần vẫn 200), kể cả khi đã hết lượt", async () => {
    expect((await handleLookup(req, deps())).status).toBe(200);
    for (let i = 0; i < 40; i++) expect((await handleLookup(req, deps())).status).toBe(200);
    expect(ask).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 30; i++) await store.hit(deps().ip, deps().now);
    expect((await handleLookup(req, deps())).status).toBe(200);
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
    expect(errorLog).toHaveBeenCalledWith("[lookup]", "ask", 402, "credit");
  });

  it("ask ném lỗi thường → 503 error, không văng", async () => {
    ask.mockRejectedValue(new Error("boom"));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 503, body: { status: "unavailable", reason: "error" } });
    expect(await store.getCached(cacheKey("lout", SENTENCE))).toBeNull();
    expect(errorLog).toHaveBeenCalledWith("[lookup]", "ask", undefined, "boom");
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
    expect(errorLog).toHaveBeenCalledWith("[lookup]", "store-read", undefined, "network");
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
    expect(errorLog).toHaveBeenCalledWith("[lookup]", "cache-write", undefined, "network");
  });

  it("addSpentUsd ném sau khi ask xong → vẫn 200 ok và vẫn lưu cache", async () => {
    store.addSpentUsd = vi.fn().mockRejectedValue(new Error("network"));
    const res = await handleLookup(req, deps());
    expect(res).toEqual({ status: 200, body: { status: "ok", result: LOUT } });
    expect(await store.getCached(cacheKey("lout", SENTENCE))).toEqual(LOUT);
    expect(errorLog).toHaveBeenCalledWith("[lookup]", "spend-write", undefined, "network");
  });

  it("log không chứa đối tượng lỗi gốc (chỉ chuỗi/số)", async () => {
    ask.mockRejectedValue(Object.assign(new Error("boom"), { status: 500, headers: { "x-api-key": "sk-secret" } }));
    await handleLookup(req, deps());
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("sk-secret");
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
