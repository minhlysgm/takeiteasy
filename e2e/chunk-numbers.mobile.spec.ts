import { test, expect } from "@playwright/test";

// Số thứ tự cụm hiện ở 3 nơi (số tròn trong nguyên văn, danh sách ghi chú, "// chunk i/n" trong tấm)
// đều tính theo thứ tự passage.chunks — test này chốt chúng luôn khớp nhau.
for (const n of [1, 2, 3]) {
  test(`Khi chạm số tròn hoặc ghi chú thứ i ở đoạn ${n} thì tấm mở đúng "chunk i/n" và cùng một cụm`, async ({ page }) => {
    await page.goto(`/read/the-subtle-art/ch01/${n}`);
    await page.getByTestId("translation-col").tap();
    await page.getByRole("button", { name: /giải thích/ }).tap();
    const badges = page.getByTestId("chunk-badge");
    const notes = page.getByTestId("mobile-notes").getByRole("button");
    const count = await notes.count();
    expect(await badges.count()).toBe(count);
    for (let i = 0; i < count; i++) {
      expect(await badges.nth(i).getAttribute("data-n"), "số tròn").toBe(String(i + 1));
      await expect(notes.nth(i), "số trong danh sách ghi chú").toContainText(String(i + 1));

      await notes.nth(i).tap();
      const fromNote = page.getByRole("dialog");
      await expect(fromNote).toContainText(`// chunk ${i + 1}/${count}`);
      const title = await fromNote.getByRole("heading").textContent();
      await fromNote.getByRole("button", { name: "đóng", exact: true }).tap();
      await expect(page.getByRole("dialog")).toBeHidden();

      await badges.nth(i).tap();
      await expect(page.getByRole("dialog")).toContainText(`// chunk ${i + 1}/${count}`);
      await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(title!);
      await page.getByRole("dialog").getByRole("button", { name: "đóng", exact: true }).tap();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
  });
}
