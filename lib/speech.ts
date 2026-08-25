export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.speechSynthesis?.getVoices === "function";
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    null
  );
}

/** Đọc to `text` bằng giọng tiếng Anh. Tính năng phụ: mọi lỗi nuốt lặng lẽ, không kéo sập reader. */
export function speak(text: string, opts: { rate?: number } = {}): void {
  if (!isSpeechAvailable()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = opts.rate ?? 0.9; // chậm hơn bình thường một chút cho người học
    const v = pickVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}
