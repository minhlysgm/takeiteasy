import type { Page } from "@playwright/test";
import { sketchSeenKey } from "@/lib/sketchSeen";

// Dùng chung cho các e2e không kiểm luồng "vẽ trước": coi như đã xem hình của các thẻ,
// mở thẻ là hình, đoạn mô tả, bản dịch hiện đủ ngay (không chờ vẽ, không gõ chữ).

/** Đánh dấu các thẻ đã xem hình (`sketchSeenKey(id)` = "1") trước khi trang chạy. */
export async function markCardsSeen(page: Page, ids = ["ch01-p01", "ch01-p02", "ch01-p03"]): Promise<void> {
  await page.addInitScript((keys) => {
    for (const k of keys) localStorage.setItem(k, "1");
  }, ids.map(sketchSeenKey));
}
