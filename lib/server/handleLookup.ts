import { createHash } from "node:crypto";
import { getPassage } from "@/lib/content";
import { canLookUp, normalizeSelectionText } from "@/lib/selection";
import type { LookupRequest, LookupResponse, LookupResult } from "@/lib/lookupTypes";
import type { LookupStore } from "@/lib/server/lookupStore";

export type AskFn = (text: string, sentence: string) => Promise<{ result: LookupResult; costUsd: number }>;

export interface LookupDeps {
  store: LookupStore | null;
  ask: AskFn | null;
  ip: string;
  budgetUsd: number;
  now: number;
}

const MAX_TEXT_CHARS = 120;
const MAX_SENTENCE_CHARS = 600;
const MAX_HITS_PER_HOUR = 30;
const CACHE_TTL_SECONDS = 2_592_000; // 30 ngày

type Out = { status: number; body: LookupResponse };
const unavailable = (status: number, reason: "invalid" | "limited" | "paused" | "error"): Out => ({
  status,
  body: { status: "unavailable", reason },
});

export function cacheKey(text: string, sentence: string): string {
  return "lookup:v1:cache:" + createHash("sha256").update(JSON.stringify([text, sentence])).digest("hex");
}

function parse(input: unknown): LookupRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  if (
    typeof r.bookId !== "string" ||
    typeof r.chapterId !== "string" ||
    typeof r.passageIndex !== "number" ||
    !Number.isInteger(r.passageIndex) ||
    typeof r.text !== "string" ||
    typeof r.sentence !== "string"
  )
    return null;
  return r as unknown as LookupRequest;
}

/** Trả { text, sentence } đã chuẩn hoá nếu yêu cầu hợp lệ, ngược lại null. */
function validate(input: unknown): { text: string; sentence: string } | null {
  const req = parse(input);
  if (!req) return null;
  if (req.text.length > MAX_TEXT_CHARS || req.sentence.length > MAX_SENTENCE_CHARS) return null;
  const text = normalizeSelectionText(req.text);
  const sentence = normalizeSelectionText(req.sentence);
  if (!text || !sentence || !canLookUp(text)) return null;
  const passage = getPassage(req.bookId, req.chapterId, req.passageIndex);
  if (!passage) return null;
  if (!normalizeSelectionText(passage.original).includes(sentence)) return null;
  if (!sentence.includes(text)) return null;
  return { text, sentence };
}

const isPaymentError = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { status?: unknown }).status === 402;

export async function handleLookup(input: unknown, deps: LookupDeps): Promise<Out> {
  const valid = validate(input);
  if (!valid) return unavailable(400, "invalid");
  const { store, ask } = deps;
  if (!store || !ask) return unavailable(503, "paused");

  if ((await store.hit(deps.ip, deps.now)) > MAX_HITS_PER_HOUR) return unavailable(429, "limited");

  const key = cacheKey(valid.text, valid.sentence);
  const cached = await store.getCached(key);
  if (cached) return { status: 200, body: { status: "ok", result: cached } };

  if ((await store.getSpentUsd()) >= deps.budgetUsd) return unavailable(503, "paused");

  try {
    const { result, costUsd } = await ask(valid.text, valid.sentence);
    await store.addSpentUsd(costUsd);
    await store.setCached(key, result, CACHE_TTL_SECONDS);
    return { status: 200, body: { status: "ok", result } };
  } catch (err) {
    const cost = typeof err === "object" && err !== null ? (err as { costUsd?: unknown }).costUsd : undefined;
    if (typeof cost === "number") await store.addSpentUsd(cost).catch(() => {});
    return unavailable(503, isPaymentError(err) ? "paused" : "error");
  }
}
