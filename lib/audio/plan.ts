import { audioPath } from "./audioPath";
import type { VoiceId } from "./voices";

/**
 * So các câu cần có với các file đã có.
 * `existing`: đường dẫn `/audio/...` đang có trong public/. `chars` = tổng ký tự phải tạo (= credit ElevenLabs).
 */
export function planAudio<T extends { voice: VoiceId; text: string }>(
  items: T[],
  existing: Set<string>,
): { todo: T[]; orphans: string[]; chars: number } {
  const wanted = new Set(items.map((i) => audioPath(i.voice, i.text)));
  const todo = items.filter((i) => !existing.has(audioPath(i.voice, i.text)));
  const orphans = [...existing].filter((p) => !wanted.has(p)).sort();
  const chars = todo.reduce((sum, i) => sum + i.text.length, 0);
  return { todo, orphans, chars };
}
