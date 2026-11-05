import type { LookupRequest, LookupResponse } from "@/lib/lookupTypes";

/** Lâu hơn trường hợp xấu nhất phía server (Claude 9s × 2 lần thử + Redis) để không bỏ cuộc khi server vẫn đang tính tiền. */
const TIMEOUT_MS = 25_000;

const UNAVAILABLE: LookupResponse = { status: "unavailable", reason: "error" };

/** Kết quả 200 có đủ các ô chữ thẻ cần vẽ không (chặn thẻ vỡ khi server trả lệch khuôn). */
function isOkResponse(body: unknown): body is Extract<LookupResponse, { status: "ok" }> {
  const b = body as { status?: unknown; result?: Record<string, unknown> } | null;
  const r = b?.result;
  const ex = r?.example as Record<string, unknown> | undefined;
  return (
    b?.status === "ok" &&
    ["headword", "ipa", "pos", "meaning"].every((k) => typeof r?.[k] === "string") &&
    typeof ex?.en === "string" &&
    typeof ex?.vi === "string"
  );
}

/**
 * `POST /api/lookup`. Mạng lỗi / status khác 200 / JSON hỏng → `unavailable` ("error"); thẻ chỉ có một câu
 * báo chung nên không cần phân biệt lý do. Quá 25 giây cũng tính là lỗi. Bị huỷ (`signal` của người gọi) thì ném lại `AbortError` để người gọi bỏ qua.
 */
export async function fetchLookup(req: LookupRequest, signal?: AbortSignal): Promise<LookupResponse> {
  // Tự ghép huỷ + hết giờ bằng AbortController/setTimeout: AbortSignal.any/timeout chưa có trên Safari < 17.4.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  else signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: ctrl.signal,
    });
    if (res.status !== 200) return UNAVAILABLE;
    const body: unknown = await res.json();
    return isOkResponse(body) ? body : UNAVAILABLE;
  } catch (e) {
    // Lỗi do huỷ (fetch hoặc đọc body) là DOMException "AbortError" — không phải lúc nào cũng `instanceof Error`.
    if (signal?.aborted) throw e;
    return UNAVAILABLE;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
