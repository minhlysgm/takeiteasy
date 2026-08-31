const PREFIX = "tie:hint:";

/** Đã xem mẹo này chưa. Storage bị chặn → coi như đã xem để không làm phiền lặp lại. */
export function isHintSeen(id: string): boolean {
  try {
    return localStorage.getItem(PREFIX + id) === "1";
  } catch {
    return true;
  }
}

export function markHintSeen(id: string): void {
  try {
    localStorage.setItem(PREFIX + id, "1");
  } catch {
    /* ignore */
  }
}
