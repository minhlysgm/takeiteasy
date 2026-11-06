import { books, getPassages } from "@/lib/content";
import { audioPath } from "./audioPath";
import { VOICES, type VoiceId } from "./voices";

export interface AudioText { voice: VoiceId; text: string; label: string }

/** Mọi câu cần có file audio: caption + câu ví dụ của mọi chunk × 5 giọng, cộng câu nghe thử của đúng giọng đó. */
export function audioTexts(): AudioText[] {
  const sentences: { text: string; label: string }[] = [];
  for (const book of books) {
    for (const chapter of book.chapters) {
      for (const passage of getPassages(book.id, chapter.id) ?? []) {
        sentences.push({ text: passage.caption, label: `${passage.id} mô tả` });
        for (const chunk of passage.chunks) {
          chunk.examples.forEach((ex, i) => {
            sentences.push({ text: ex.en, label: `${passage.id} ${chunk.id} ví dụ ${i + 1}` });
          });
        }
      }
    }
  }

  const out: AudioText[] = [];
  const seen = new Set<string>(); // cùng câu xuất hiện hai lần → chỉ một file
  const add = (item: AudioText) => {
    const path = audioPath(item.voice, item.text);
    if (seen.has(path)) return;
    seen.add(path);
    out.push(item);
  };
  for (const voice of VOICES) {
    for (const s of sentences) add({ voice: voice.id, ...s });
    add({ voice: voice.id, text: voice.sample, label: `nghe thử ${voice.name}` });
  }
  return out;
}
