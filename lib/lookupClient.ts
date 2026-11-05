import type { LookupRequest, LookupResponse } from "@/lib/lookupTypes";

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
 * báo chung nên không cần phân biệt lý do. Bị huỷ (`signal`) thì ném lại `AbortError` để người gọi bỏ qua.
 */
export async function fetchLookup(req: LookupRequest, signal?: AbortSignal): Promise<LookupResponse> {
  try {
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
    if (res.status !== 200) return UNAVAILABLE;
    const body: unknown = await res.json();
    return isOkResponse(body) ? body : UNAVAILABLE;
  } catch (e) {
    // Lỗi do huỷ (fetch hoặc đọc body) là DOMException "AbortError" — không phải lúc nào cũng `instanceof Error`.
    if (signal?.aborted) throw e;
    return UNAVAILABLE;
  }
}
