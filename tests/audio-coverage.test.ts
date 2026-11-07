import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { audioTexts } from "@/lib/audio/texts";
import { audioPath } from "@/lib/audio/audioPath";

const fileOf = (a: { voice: Parameters<typeof audioPath>[0]; text: string }) => join(process.cwd(), "public", audioPath(a.voice, a.text));

// TC15: thẻ mới / sửa chữ mà chưa chạy `npm run audio` thì test này đỏ và nêu tên câu thiếu.
it("mọi câu đọc to và câu nghe thử đều có file audio", () => {
  const missing = audioTexts().filter((a) => !existsSync(fileOf(a)));
  expect(missing.map((m) => `${m.label} · ${m.voice}`)).toEqual([]);
});

// File hỏng (0 byte / gần rỗng do lỗi mạng) thì trình duyệt lặng lẽ lui về giọng máy — chặn ở đây.
it("file audio nào cũng > 1 KB", () => {
  const tiny = audioTexts().filter((a) => existsSync(fileOf(a)) && statSync(fileOf(a)).size <= 1024);
  expect(tiny.map((m) => `${m.label} · ${m.voice}`)).toEqual([]);
});
