import { describe, expect, it, vi } from "vitest";
import { LookupAiError, costUsd, makeAsk } from "@/lib/server/claudeLookup";

const SENTENCE =
  "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout, a cheapskate, a deadbeat, and on his worst days, a poet.";
const RESULT = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "danh từ",
  meaning: "gã thô lỗ, vụng về",
  example: { en: "Nobody invited the lout to dinner.", vi: "Không ai mời gã thô lỗ đó đi ăn tối." },
};

const fakeClient = (create: ReturnType<typeof vi.fn>) =>
  ({ messages: { create } }) as unknown as Parameters<typeof makeAsk>[0];
const reply = (text: string | null, stop_reason = "end_turn", usage = { input_tokens: 2000, output_tokens: 0 }) => ({
  content: text === null ? [{ type: "thinking", thinking: "..." }] : [{ type: "text", text }],
  stop_reason,
  usage,
});

describe("claudeLookup", () => {
  it("gửi đúng model, effort, prompt; trả result + costUsd", async () => {
    const create = vi
      .fn()
      .mockResolvedValue(reply(JSON.stringify(RESULT), "end_turn", { input_tokens: 1000, output_tokens: 1000 }));
    const out = await makeAsk(fakeClient(create))("lout", SENTENCE);

    expect(out.result).toEqual(RESULT);
    expect(out.costUsd).toBeCloseTo(0.0006, 10);
    const args = create.mock.calls[0][0];
    expect(args.model).toBe("claude-haiku-5-5");
    expect(args.max_tokens).toBe(2000);
    expect(args.output_config.effort).toBe("low");
    expect(args.output_config.format.type).toBe("json_schema");
    expect(args.output_config.format.schema.properties).toHaveProperty("headword");
    expect(args.system).toContain("concise English–Vietnamese dictionary");
    expect(args.messages).toHaveLength(1);
    expect(args.messages[0].role).toBe("user");
    expect(args.messages[0].content).toContain("SELECTION: lout");
    expect(args.messages[0].content).toContain(`SENTENCE: ${SENTENCE}`);
    for (const k of ["temperature", "top_p", "top_k", "thinking"]) expect(args).not.toHaveProperty(k);
  });

  it("refusal / cắt cụt max_tokens / không có text / JSON hỏng / thiếu trường → LookupAiError có costUsd", async () => {
    const { example: _example, ...noExample } = RESULT;
    void _example;
    const bad = [
      reply(JSON.stringify(RESULT), "refusal"),
      reply(JSON.stringify(RESULT), "max_tokens"),
      reply(null),
      reply("{not json"),
      reply(JSON.stringify(noExample)),
    ];
    for (const r of bad) {
      const create = vi.fn().mockResolvedValue(r);
      const err = await makeAsk(fakeClient(create))("lout", SENTENCE).catch((e: unknown) => e);
      expect(err, JSON.stringify(r)).toBeInstanceOf(LookupAiError);
      expect((err as LookupAiError).costUsd).toBeCloseTo(0.0002, 10);
    }
  });

  it("lỗi API (vd. 402) được ném nguyên vẹn", async () => {
    const apiErr = Object.assign(new Error("credit"), { status: 402 });
    const create = vi.fn().mockRejectedValue(apiErr);
    await expect(makeAsk(fakeClient(create))("lout", SENTENCE)).rejects.toBe(apiErr);
  });

  it("costUsd(1e6 vào, 1e6 ra) = 0.6", () => {
    expect(costUsd({ input_tokens: 1e6, output_tokens: 1e6 })).toBeCloseTo(0.6, 10);
  });
});
