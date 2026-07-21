export type Chunk = { en: string; vi: string };
export type Variant = { en: string; why: string };
export type Line = {
  sit: string;
  them: { en: string; vi: string } | null;
  think: string;
  en: string;
  vi: string;
  chunks: Chunk[];
  tone: string;
  variants: Variant[];
};
export type BossOption = { en: string; ok: boolean; why: string };
export type BossQuestion = { q: string; opts: BossOption[] };
export type Scene = {
  id: string;
  icon: string;
  title: string;
  blurb: string;
  lines: Line[];
  boss: BossQuestion[];
};
