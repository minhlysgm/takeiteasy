/** Số đoạn (1-based) từ URL, kẹp vào [1, count]: không phải số nguyên hoặc < 1 → 1, vượt quá → count. */
export function passageIndexOf(raw: string, count: number): number {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, count);
}
