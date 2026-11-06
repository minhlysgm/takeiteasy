// Danh sách giọng đọc AI (ElevenLabs). Thuần dữ liệu — dùng được cả ở node (script tạo audio) lẫn trình duyệt.
export type VoiceId = "will" | "brian" | "adam" | "sarah" | "jessica";

export interface Voice {
  id: VoiceId;
  name: string;
  elevenId: string;
  desc: string;
  sample: string;
}

// Thứ tự = thứ tự hiển thị.
export const VOICES: readonly Voice[] = [
  { id: "will", name: "Will", elevenId: "bIHbv24MWmeRgasZH58o", desc: "nam · trẻ, thoải mái", sample: "Hi, I'm Will. Let's read this one together." },
  { id: "brian", name: "Brian", elevenId: "nPczCjzI2devNBz1zQrb", desc: "nam · trầm, kể chuyện", sample: "Hi, I'm Brian. Let's read this one together." },
  { id: "adam", name: "Adam", elevenId: "pNInz6obpgDQGcFmaJgB", desc: "nam · chắc, rõ", sample: "Hi, I'm Adam. Let's read this one together." },
  { id: "sarah", name: "Sarah", elevenId: "EXAVITQu4vr4xnSDxMaL", desc: "nữ · điềm tĩnh", sample: "Hi, I'm Sarah. Let's read this one together." },
  { id: "jessica", name: "Jessica", elevenId: "cgSgspJ2msm6clMCkdW9", desc: "nữ · trẻ, tươi", sample: "Hi, I'm Jessica. Let's read this one together." },
];

export const DEFAULT_VOICE: VoiceId = "will";

// Không gửi voice_settings: giữ mặc định của giọng (tốc độ 1.0).
export const TTS_MODEL = "eleven_multilingual_v2";
export const TTS_FORMAT = "mp3_44100_64";

export function isVoiceId(x: unknown): x is VoiceId {
  return typeof x === "string" && VOICES.some((v) => v.id === x);
}

export function voiceName(id: VoiceId): string {
  return VOICES.find((v) => v.id === id)?.name ?? id;
}
