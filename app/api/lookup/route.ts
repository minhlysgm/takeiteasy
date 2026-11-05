import Anthropic from "@anthropic-ai/sdk";
import { makeAsk } from "@/lib/server/claudeLookup";
import { handleLookup } from "@/lib/server/handleLookup";
import { storeFromEnv } from "@/lib/server/lookupStore";

export const runtime = "nodejs";

const DEFAULT_BUDGET_USD = 9;

function budgetFromEnv(raw: string | undefined): number {
  // Chuỗi rỗng (vd. `LOOKUP_BUDGET_USD=` trong .env) → mặc định, không phải 0 (Number("") === 0 sẽ tạm ngưng vĩnh viễn).
  // NaN/âm → mặc định; nếu không, `spent >= NaN` luôn false và ngân sách thành vô hạn.
  const n = raw?.trim() ? Number(raw) : DEFAULT_BUDGET_USD;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BUDGET_USD;
}

export async function POST(req: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return Response.json({ status: "unavailable", reason: "invalid" }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { status, body } = await handleLookup(input, {
    store: storeFromEnv(process.env),
    ask: process.env.ANTHROPIC_API_KEY ? makeAsk(new Anthropic({ timeout: 15_000, maxRetries: 1 })) : null,
    ip,
    budgetUsd: budgetFromEnv(process.env.LOOKUP_BUDGET_USD),
    now: Date.now(),
  });
  return Response.json(body, { status });
}
