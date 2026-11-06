export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type NoteSide = "left" | "right";

/**
 * Chọn lề cho ghi chú của một cụm từ các rect của nó (`getClientRects()`, mỗi dòng một rect):
 * đầu cụm (rect đầu) cách mép trái cột bao xa, cuối cụm (rect cuối) cách mép phải bao xa — gần bên nào thì
 * ghi chú nằm lề bên đó, ngang đúng dòng chứa rect ấy. Hoà thì lề trái.
 */
export function pickNoteSide(rects: Box[], col: { left: number; right: number }): { side: NoteSide; line: Box } {
  const first = rects[0];
  const last = rects[rects.length - 1];
  return first.left - col.left <= col.right - last.right ? { side: "left", line: first } : { side: "right", line: last };
}

/**
 * Mũi tên ngắn "tay vẽ" từ ghi chú tới sát mép cột chữ, ngang tâm dòng có cụm. Điểm điều khiển đều nằm giữa
 * hai đầu theo trục ngang nên đường cong không bao giờ lấn vào vùng chữ; đoạn cuối nằm ngang để đầu mũi tên
 * chỉ thẳng vào dòng.
 */
export function buildEdgeArrow(from: Pt, to: Pt): string {
  const mx = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${mx} ${from.y - 4}, ${mx} ${to.y}, ${to.x} ${to.y}`;
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
