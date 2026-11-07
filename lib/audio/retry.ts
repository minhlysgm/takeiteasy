/** Số lần thử lại tối đa khi ElevenLabs trả 429 (quá nhiều lượt cùng lúc). */
export const MAX_RETRIES = 3;

/** Thời gian chờ (ms) trước lần thử lại thứ `attempt` (0, 1, 2…): theo `Retry-After` (giây) nếu có, không thì 2s, 4s, 8s. */
export function retryDelay(attempt: number, retryAfter: string | null): number {
  const secs = Number(retryAfter);
  if (retryAfter !== null && retryAfter.trim() !== "" && Number.isFinite(secs) && secs >= 0) return Math.min(secs, 60) * 1000;
  return 2000 * 2 ** attempt;
}

/** Gọi `request`; gặp 429 thì chờ rồi thử lại tối đa MAX_RETRIES lần. Trả về phản hồi cuối cùng (có thể vẫn là 429). */
export async function withRetry429(
  request: () => Promise<Response>,
  onWait: (ms: number) => void = () => {},
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await request();
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;
    const wait = retryDelay(attempt, res.headers.get("retry-after"));
    onWait(wait);
    await sleep(wait);
  }
}
