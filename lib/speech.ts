export function stripName(text: string): string {
  const hadName = /\{name\}/.test(text);
  let out = text.replace(/\{name\}/g, "");
  if (hadName) out = out.replace(/^\s*[,—-]\s*/, ""); // drop punctuation left by removed name
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === "en-US")
      ?? voices.find(v => v.lang?.startsWith("en"))
      ?? null;
}

export function initVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.onvoiceschanged = () => { /* voices now cached */ };
  window.speechSynthesis.getVoices();
}

export function speak(text: string, opts: { rate?: number } = {}): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(stripName(text));
    u.lang = "en-US";
    u.rate = opts.rate ?? 1.0;
    const v = pickVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch { /* ignore */ }
}
