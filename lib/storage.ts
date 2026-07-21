const K = { name: "gc:name", best: "gc:bestScore", done: "gc:completed" } as const;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export function getName(): string | null { return read(K.name); }
export function setName(name: string): void { write(K.name, name); }

export function getBestScore(): number { return Number(read(K.best) ?? 0) || 0; }
export function setBestScore(n: number): void { if (n > getBestScore()) write(K.best, String(n)); }

export function getCompleted(): string[] {
  try { return JSON.parse(read(K.done) ?? "[]"); } catch { return []; }
}
export function addCompleted(id: string): void {
  const set = new Set(getCompleted()); set.add(id);
  write(K.done, JSON.stringify([...set]));
}
