import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { audioTexts } from "@/lib/audio/texts";
import { audioPath } from "@/lib/audio/audioPath";

// TC15: thẻ mới / sửa chữ mà chưa chạy `npm run audio` thì test này đỏ và nêu tên câu thiếu.
it("mọi câu đọc to và câu nghe thử đều có file audio", () => {
  const missing = audioTexts().filter((a) => !existsSync(join(process.cwd(), "public", audioPath(a.voice, a.text))));
  expect(missing.map((m) => `${m.label} · ${m.voice}`)).toEqual([]);
});
