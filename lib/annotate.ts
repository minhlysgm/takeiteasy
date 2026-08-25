export interface Pt {
  x: number;
  y: number;
}

/** Đường cong "tay vẽ" từ ghi chú lề tới chunk. */
export function buildArrowPath(from: Pt, to: Pt): string {
  const dx = Math.max(24, Math.abs(to.x - from.x) * 0.4);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y - 24}, ${to.x - dx} ${to.y + 28}, ${to.x} ${to.y}`;
}

/** Xếp ghi chú theo trục dọc: mỗi ghi chú nằm gần dòng chứa chunk nhất có thể, đẩy xuống nếu đè lên ghi chú trước. */
export function layoutNotes(
  items: { id: string; y: number; height: number }[],
  gap = 10,
): Record<string, number> {
  const out: Record<string, number> = {};
  let cursor = -Infinity;
  for (const it of [...items].sort((a, b) => a.y - b.y)) {
    const y = Math.max(it.y, cursor);
    out[it.id] = y;
    cursor = y + it.height + gap;
  }
  return out;
}
