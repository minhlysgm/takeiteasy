import type { Page } from "@playwright/test";

// Dùng chung cho các e2e không kiểm luồng "vẽ trước": coi như đã xem hình của các thẻ,
// mở thẻ là hình, đoạn mô tả, bản dịch hiện đủ ngay (không chờ vẽ, không gõ chữ).

/** Đánh dấu các thẻ đã xem hình (`tie:sketch-seen:<id>` = "1") trước khi trang chạy. */
export async function markCardsSeen(page: Page, ids = ["ch01-p01", "ch01-p02", "ch01-p03"]): Promise<void> {
  await page.addInitScript((list) => {
    for (const id of list) localStorage.setItem(`tie:sketch-seen:${id}`, "1");
  }, ids);
}
