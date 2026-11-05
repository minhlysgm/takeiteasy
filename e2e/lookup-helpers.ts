import type { Page } from "@playwright/test";
import type { LookupResponse, LookupResult } from "@/lib/lookupTypes";

// Dùng chung cho e2e/lookup.spec.ts (desktop) và e2e/lookup.mobile.spec.ts. KHÔNG bao giờ gọi AI thật.

export const LOUT: LookupResult = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "danh từ",
  meaning: "kẻ thô lỗ, cục cằn, cư xử khó coi",
  example: {
    en: "Don't be a lout. Say thank you to the waiter.",
    vi: "Đừng có thô lỗ thế, cảm ơn người phục vụ đi.",
  },
};

/**
 * Giả lập POST /api/lookup. `reply` = "hang" thì không trả lời (để thấy khung xương);
 * `calls` (nếu có) nhận body JSON của từng request. status "unavailable" trả HTTP 503 như server thật.
 */
export async function mockLookup(page: Page, reply: LookupResponse | "hang", calls?: unknown[]) {
  await page.route("**/api/lookup", async (route) => {
    calls?.push(route.request().postDataJSON());
    if (reply === "hang") return;
    await route.fulfill({
      status: reply.status === "ok" ? 200 : 503,
      contentType: "application/json",
      body: JSON.stringify(reply),
    });
  });
}
