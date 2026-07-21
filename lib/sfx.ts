let ctx: AudioContext | null = null;

function AC(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as any).webkitAudioContext ?? null;
}

export function initAudio(): void {
  try {
    const Ctor = AC();
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* ignore */ }
}

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.06, delay = 0): void {
  try {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch { /* ignore */ }
}

export const sfx = {
  click: () => tone(440, 0.05, "triangle", 0.04),
  matchOk: (combo: number) => {
    const base = 520 + Math.min(combo, 8) * 70;
    tone(base, 0.09, "square", 0.06);
    tone(base * 1.5, 0.08, "square", 0.04, 0.05);
  },
  matchNo: () => { tone(180, 0.12, "sawtooth", 0.05); tone(140, 0.14, "sawtooth", 0.05, 0.04); },
  send: () => { tone(660, 0.06, "triangle", 0.05); tone(990, 0.08, "triangle", 0.04, 0.05); },
  ping: () => { tone(880, 0.07, "sine", 0.05); tone(1240, 0.06, "sine", 0.04, 0.06); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.06, i * 0.09)); },
};
