import "server-only";
import { createHash } from "node:crypto";
import { getPassage } from "@/lib/content";
import { canLookUp, MAX_LOOKUP_CHARS, MAX_SENTENCE_CHARS, normalizeSelectionText, sentenceAt } from "@/lib/selection";
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

const MAX_HITS_PER_HOUR = 30;
const CACHE_TTL_SECONDS = 2_592_000; // 30 ngày

type Out = { status: number; body: LookupResponse };
const unavailable = (status: number, reason: "invalid" | "limited" | "paused" | "error"): Out => ({
  status,
  body: { status: "unavailable", reason },
});

export function cacheKey(text: string, sentence: string): string {
  return "lookup:v1:cache:" + createHash("sha256").update(text + "\n" + sentence).digest("hex");
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

const escapeRegExp = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Câu chuẩn do server tự tính: tìm `text` (trọn từ, khoảng trắng linh hoạt) trong nguyên văn rồi `sentenceAt`.
 * Có nhiều chỗ → lấy chỗ có câu trùng `hint` (câu trình duyệt gửi), không trùng thì lấy chỗ đầu tiên.
 * Nhờ vậy khoá cache chỉ gồm các cặp (cụm trọn từ, câu) có thật trong sách → số lượt tốn tiền có giới hạn.
 */
function canonicalSentence(original: string, text: string, hint: string): string | null {
  const pattern = text.split(" ").map(escapeRegExp).join("\\s+");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "gu");
  let first: string | null = null;
  for (const m of original.matchAll(re)) {
    const sentence = sentenceAt(original, m.index, m.index + m[0].length);
    if (sentence === hint) return sentence;
    first ??= sentence;
  }
  return first;
}

/** Trả { text, sentence } chuẩn (chữ tra bỏ dấu câu hai đầu, câu do server tự tính) nếu hợp lệ, ngược lại null. */
function validate(input: unknown): { text: string; sentence: string } | null {
  const req = parse(input);
  if (!req) return null;
  if (req.text.length > MAX_LOOKUP_CHARS || req.sentence.length > MAX_SENTENCE_CHARS) return null;
  const text = normalizeSelectionText(req.text).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!text || !canLookUp(text)) return null;
  const passage = getPassage(req.bookId, req.chapterId, req.passageIndex);
  if (!passage) return null;
  const sentence = canonicalSentence(passage.original, text, normalizeSelectionText(req.sentence));
  return sentence ? { text, sentence } : null;
}

const isPaymentError = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { status?: unknown }).status === 402;

/** Ghi log phía server: chỉ loại lỗi, status và message — không bao giờ ghi nguyên đối tượng lỗi (SDK có thể kèm header/khoá). */
function logError(kind: "store-read" | "ask" | "spend-write" | "cache-write", err: unknown): void {
  const e = typeof err === "object" && err !== null ? (err as { status?: unknown; message?: unknown }) : {};
  console.error("[lookup]", kind, e.status, typeof e.message === "string" ? e.message : String(err));
}

export async function handleLookup(input: unknown, deps: LookupDeps): Promise<Out> {
  const valid = validate(input);
  if (!valid) return unavailable(400, "invalid");
  const { store, ask } = deps;
  if (!store || !ask) return unavailable(503, "paused");

  const key = cacheKey(valid.text, valid.sentence);
  try {
    // Xem cache trước: tra lại chữ đã có kết quả không tốn tiền nên không trừ lượt.
    const cached = await store.getCached(key);
    if (cached) return { status: 200, body: { status: "ok", result: cached } };
    if ((await store.hit(deps.ip, deps.now)) > MAX_HITS_PER_HOUR) return unavailable(429, "limited");
    if ((await store.getSpentUsd()) >= deps.budgetUsd) return unavailable(503, "paused");
  } catch (err) {
    logError("store-read", err);
    return unavailable(503, "error");
  }

  let asked: { result: LookupResult; costUsd: number };
  try {
    asked = await ask(valid.text, valid.sentence);
  } catch (err) {
    logError("ask", err);
    const cost = typeof err === "object" && err !== null ? (err as { costUsd?: unknown }).costUsd : undefined;
    if (typeof cost === "number") await store.addSpentUsd(cost).catch((e) => logError("spend-write", e));
    return unavailable(503, isPaymentError(err) ? "paused" : "error");
  }
  // Đã có kết quả: lỗi ghi sổ/cache không được làm mất kết quả của người dùng.
  await store.addSpentUsd(asked.costUsd).catch((e) => logError("spend-write", e));
  await store.setCached(key, asked.result, CACHE_TTL_SECONDS).catch((e) => logError("cache-write", e));
  return { status: 200, body: { status: "ok", result: asked.result } };
}
