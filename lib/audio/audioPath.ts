import { TTS_FORMAT, TTS_MODEL, type VoiceId } from "./voices";

// FNV-1a 64-bit trên UTF-8 — đồng bộ, như nhau ở node và trình duyệt.
// Đổi thuật toán / chuỗi băm = phải tạo lại toàn bộ audio.
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK = 0xffffffffffffffffn;

function fnv1a64(input: string): string {
  let h = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(input)) {
    h ^= BigInt(byte);
    h = (h * FNV_PRIME) & MASK;
  }
  return h.toString(16).padStart(16, "0");
}

export function audioPath(voice: VoiceId, text: string): string {
  return `/audio/${voice}/${fnv1a64(`${TTS_MODEL}|${TTS_FORMAT}|${voice}|${text}`)}.mp3`;
}
