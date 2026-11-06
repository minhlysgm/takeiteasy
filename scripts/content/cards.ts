/**
 * Công cụ biên tập thẻ (skill `bien-tap`). Chạy: `npm run content -- <lệnh>`
 *
 *   status            sổ thẻ: đã phủ tới đâu, thẻ nào đang dở, id thẻ kế tiếp
 *   new <chương> "<nguồn>" [sách]  mở thẻ mới — kiểm trùng TRƯỚC, trùng thì không tạo gì
 *   check [id] [--fast]  soát thẻ (≥ ④): độ dài, chunk, chép sách, trùng nguồn, chữ dính nét (--fast bỏ đo hình)
 *   preview <id>      tạo trang xem trước .content-preview/<id>.html (đăng artifact cho Minh xem)
 *   ledger            ghi lại bảng tự sinh trong SO-THE.md
 *
 * Dữ liệu: docs/content/<sách>/SO-THE.md, docs/content/<sách>/cards/<id>.md + <id>.sketch.json.
 * Bản nguồn (đoạn sách Minh gửi) nằm ở content-src/<sách>/ — gitignored, không bao giờ commit.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type Pos = [number, number]; // [trang, ¶]
export type Range = { from: Pos; to: Pos };
export type CardChunk = {
  headword: string;
  match: string;
  label: string;
  meaning: string;
  pattern?: { formula: string; note: string };
  examples: { en: string; vi: string }[];
  mistake?: { wrong: string; right: string };
  note?: string;
};
export type Card = {
  file: string;
  id: string;
  chapter: number;
  rangeText: string;
  range: Range | null;
  state: number;
  idea: string;
  caption: string;
  translation: string;
  mainIdea: string;
  sketchFile: string;
  chunks: CardChunk[];
};
export type SketchLike = { viewBox: string; alt: string; steps: { kind: string; text?: string }[] };
export type Skipped = { range: Range; reason: string };
export type CheckContext = { others: Card[]; skipped: Skipped[]; sources: string[]; sketch: SketchLike | null };
export type CheckResult = { errors: string[]; warnings: string[] };

export const STATES = ["", "① nhận đoạn", "② tóm ý", "③ chốt hướng", "④ nháp", "⑤ Minh sửa", "⑥ đã soát", "⑦ trong app"];
export const CAPTION_WORDS = { min: 55, max: 80 };
export const CAPTION_SENTENCES = { min: 3, max: 5 };
export const CHUNKS = { min: 3, max: 5, ideal: 4 };
const COPY_ERROR_WORDS = 6; // ≥ 6 chữ liền trùng sách → lỗi
const COPY_WARN_WORDS = 4; // 4–5 chữ → cảnh báo, người soát tự xem

// ───────── khoảng nguồn "tr.3¶1 – tr.4¶2" ─────────

export function parseRange(s: string): Range | null {
  const m = s.trim().match(/^tr\.\s*(\d+)\s*¶\s*(\d+)(?:\s*[–-]\s*tr\.\s*(\d+)\s*¶\s*(\d+))?$/);
  if (!m) return null;
  const from: Pos = [Number(m[1]), Number(m[2])];
  const to: Pos = m[3] ? [Number(m[3]), Number(m[4])] : from;
  return cmpPos(from, to) <= 0 ? { from, to } : null;
}
const cmpPos = (a: Pos, b: Pos) => a[0] - b[0] || a[1] - b[1];
export const rangesOverlap = (a: Range, b: Range) => cmpPos(a.from, b.to) <= 0 && cmpPos(b.from, a.to) <= 0;
/** Phần của `want` chưa thẻ nào trong `covered` phủ — nói bằng lời vì không biết mỗi trang có mấy ¶. */
export function uncoveredParts(want: Range, covered: Range[]): string[] {
  const out: string[] = [];
  const p = (x: Pos) => `tr.${x[0]}¶${x[1]}`;
  const hits = covered.filter((c) => rangesOverlap(want, c)).sort((a, b) => cmpPos(a.from, b.from));
  let cursor: Pos | null = null; // điểm cuối đã phủ gần nhất
  for (const h of hits) {
    if (cursor === null && cmpPos(want.from, h.from) < 0) out.push(`từ ${p(want.from)}, trước ${p(h.from)}`);
    if (cursor !== null && cmpPos(cursor, h.from) < 0) out.push(`sau ${p(cursor)}, trước ${p(h.from)}`);
    if (cursor === null || cmpPos(h.to, cursor) > 0) cursor = h.to;
  }
  if (cursor && cmpPos(cursor, want.to) < 0) out.push(`sau ${p(cursor)}, tới ${p(want.to)}`);
  return out;
}

const fmtRange = (r: Range) =>
  cmpPos(r.from, r.to) === 0 ? `tr.${r.from[0]}¶${r.from[1]}` : `tr.${r.from[0]}¶${r.from[1]} – tr.${r.to[0]}¶${r.to[1]}`;

// ───────── đọc file thẻ ─────────

export function parseCard(md: string, file: string): Card {
  const fm: Record<string, string> = {};
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/);
  for (const line of (fmMatch?.[1] ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const body = fmMatch ? md.slice(fmMatch[0].length) : md;
  const sections: Record<string, string> = {};
  for (const part of body.split(/^## /m).slice(1)) {
    const nl = part.indexOf("\n");
    sections[part.slice(0, nl === -1 ? undefined : nl).trim()] = nl === -1 ? "" : part.slice(nl + 1).trim();
  }
  const fileLine = (sections["Hình"] ?? "").match(/^File:\s*(.+)$/m);
  return {
    file,
    id: fm["id"] ?? "",
    chapter: Number(fm["chuong"]) || 0,
    rangeText: fm["nguon"] ?? "",
    range: parseRange(fm["nguon"] ?? ""),
    state: Number((fm["trang-thai"] ?? "").match(/\d/)?.[0] ?? 0),
    idea: fm["y"] ?? "",
    caption: oneLine(sections["Caption"]),
    translation: oneLine(sections["Bản dịch"]),
    mainIdea: oneLine(sections["Ý chính"]),
    sketchFile: fileLine?.[1].trim() ?? "",
    chunks: parseChunks(sections["Chunk"] ?? ""),
  };
}
const oneLine = (s = "") => s.replace(/\s*\n\s*/g, " ").trim();

function parseChunks(s: string): CardChunk[] {
  return s
    .split(/^### /m)
    .slice(1)
    .map((part) => {
      const [head, ...lines] = part.split("\n");
      const c: CardChunk = { headword: head.trim(), match: "", label: "", meaning: "", examples: [] };
      for (const line of lines) {
        const m = line.match(/^-\s*([^:]+):\s*(.*)$/);
        if (!m) continue;
        const [key, val] = [m[1].trim(), m[2].trim()];
        if (key === "Khớp") c.match = val;
        else if (key === "Ghi chú lề") c.label = val;
        else if (key === "Nghĩa") c.meaning = val;
        else if (key === "Ghi chú") c.note = val;
        else if (key === "Mẫu") {
          const [formula, note = ""] = val.split(/\s+—\s+/);
          c.pattern = { formula: formula.trim(), note: note.trim() };
        } else if (key === "Hay sai") {
          const [wrong, right = ""] = val.split(/\s*→\s*/);
          c.mistake = { wrong: wrong.trim(), right: right.trim() };
        } else if (key === "Ví dụ") {
          const [en, vi = ""] = val.split(/\s+—\s+/);
          c.examples.push({ en: en.trim(), vi: vi.trim() });
        }
      }
      return c;
    });
}

// ───────── thẻ mới + dấu trong file nguồn ─────────

/** Điền mẫu thẻ (mau-the.md) cho thẻ mới ở trạm ①. */
export function newCardMd(template: string, id: string, range: Range, date: string): string {
  const chapter = Number(id.slice(2, 4));
  return template
    .replace(/^id:.*$/m, `id: ${id}`)
    .replace(/^chuong:.*$/m, `chuong: ${chapter}`)
    .replace(/^nguon:.*$/m, `nguon: ${fmtRange(range)}`)
    .replace(/^trang-thai:.*$/m, "trang-thai: 1 nhận đoạn")
    .replace(/^File:.*$/m, `File: ${id}.sketch.json`)
    .replace(/^- YYYY-MM-DD · .*$/m, `- ${date} · ① nhận đoạn ${fmtRange(range)}`);
}

/** File nguồn của thẻ: mỗi đoạn mở đầu bằng [tr.N ¶k], và mọi đoạn phải nằm trong `nguon` của thẻ. */
export function checkSourceMarkers(text: string, range: Range): CheckResult {
  const out: CheckResult = { errors: [], warnings: [] };
  const marks = [...text.matchAll(/\[tr\.(\d+)\s*¶(\d+)\]/g)].map((m): Pos => [Number(m[1]), Number(m[2])]);
  if (marks.length === 0) out.warnings.push("file nguồn chưa có dấu [tr.N ¶k] đầu mỗi đoạn");
  for (const m of marks) {
    if (cmpPos(m, range.from) < 0 || cmpPos(m, range.to) > 0)
      out.errors.push(`file nguồn có đoạn tr.${m[0]}¶${m[1]} nằm ngoài nguồn ${fmtRange(range)} của thẻ — tách sang thẻ khác hoặc nới nguồn`);
  }
  return out;
}

// ───────── soát chép chữ ─────────

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Các chuỗi ≥ `min` chữ liền nhau có trong cả `text` và `source` (lấy chuỗi dài nhất, không lặp). */
export function sharedRuns(text: string, source: string, min: number): string[] {
  const src = words(source);
  const grams = new Set<string>();
  for (let i = 0; i + min <= src.length; i++) grams.add(src.slice(i, i + min).join(" "));
  const t = words(text);
  const runs: string[] = [];
  let i = 0;
  while (i + min <= t.length) {
    if (!grams.has(t.slice(i, i + min).join(" "))) {
      i++;
      continue;
    }
    let end = i + min;
    while (end < t.length && grams.has(t.slice(end - min + 1, end + 1).join(" "))) end++;
    runs.push(t.slice(i, end).join(" "));
    i = end;
  }
  return runs;
}

const QUOTE_RE = /"[^"]+"|“[^”]+”/g;

function copyChecks(where: string, text: string, sources: string[], out: CheckResult, errorMin = COPY_ERROR_WORDS) {
  for (const src of sources) {
    for (const run of sharedRuns(text, src, COPY_WARN_WORDS)) {
      const n = run.split(" ").length;
      if (n >= errorMin) out.errors.push(`${where}: chép ${n} chữ liền của sách — "${run}"`);
      else out.warnings.push(`${where}: trùng ${n} chữ với sách — "${run}" (cụm thông dụng thì bỏ qua)`);
    }
  }
}

// ───────── soát một thẻ ─────────

export function checkCard(card: Card, ctx: CheckContext): CheckResult {
  const out: CheckResult = { errors: [], warnings: [] };
  const err = (m: string) => out.errors.push(m);
  const warn = (m: string) => out.warnings.push(m);

  if (card.id !== basename(card.file, ".md")) err(`id "${card.id}" khác tên file ${basename(card.file)}`);
  if (!/^ch\d{2}-t\d{2}$/.test(card.id)) err(`id "${card.id}" phải dạng ch01-t01`);
  if (card.state < 1 || card.state > 7) err(`trang-thai không hợp lệ (cần 1–7)`);
  if (!card.range) err(`nguon "${card.rangeText}" phải dạng tr.3¶1 – tr.4¶2`);

  if (card.range) {
    for (const o of ctx.others) {
      if (o.id !== card.id && o.range && rangesOverlap(card.range, o.range))
        err(`nguồn ${fmtRange(card.range)} trùng thẻ ${o.id} (${fmtRange(o.range)})`);
    }
    for (const s of ctx.skipped) {
      if (rangesOverlap(card.range, s.range)) err(`nguồn trùng đoạn đã bỏ qua ${fmtRange(s.range)} (${s.reason})`);
    }
  }
  if (card.state < 4) return out;

  // ── nội dung ──
  if (!card.idea) err("thiếu y (ý của thẻ, 1 dòng) ở frontmatter");
  for (const [name, val] of [["Caption", card.caption], ["Bản dịch", card.translation], ["Ý chính", card.mainIdea]] as const) {
    if (!val) err(`thiếu mục ## ${name}`);
  }
  const n = words(card.caption).length;
  if (card.caption && (n < CAPTION_WORDS.min || n > CAPTION_WORDS.max))
    err(`đoạn văn ${n} từ — cần ${CAPTION_WORDS.min}–${CAPTION_WORDS.max} từ`);
  const sentences = card.caption.split(/(?<!\b(?:Mr|Mrs|Ms|Dr|a\.m|p\.m))[.!?]+["”]?(?=\s|$)/).filter((s) => s.trim()).length;
  if (card.caption && (sentences < CAPTION_SENTENCES.min || sentences > CAPTION_SENTENCES.max))
    err(`đoạn văn ${sentences} câu — cần ${CAPTION_SENTENCES.min}–${CAPTION_SENTENCES.max} câu`);

  // ── chunk ──
  if (card.chunks.length < CHUNKS.min || card.chunks.length > CHUNKS.max)
    err(`${card.chunks.length} chunk — cần ${CHUNKS.min}–${CHUNKS.max} (chuẩn ${CHUNKS.ideal})`);
  else if (card.chunks.length !== CHUNKS.ideal) warn(`${card.chunks.length} chunk — chuẩn là ${CHUNKS.ideal}`);
  const seen = new Set<string>();
  for (const c of card.chunks) {
    const tag = `chunk "${c.headword}"`;
    if (!c.match) err(`${tag}: thiếu "Khớp"`);
    else if (!card.caption.includes(c.match)) err(`${tag}: Khớp "${c.match}" không có nguyên văn trong đoạn văn`);
    if (seen.has(c.match.toLowerCase())) err(`${tag}: Khớp trùng chunk khác`);
    seen.add(c.match.toLowerCase());
    if (!c.label) err(`${tag}: thiếu "Ghi chú lề"`);
    if (!c.meaning) err(`${tag}: thiếu "Nghĩa"`);
    if (c.examples.length < 2) err(`${tag}: cần ≥ 2 ví dụ (đang có ${c.examples.length})`);
    for (const e of c.examples) if (!e.en || !e.vi) err(`${tag}: ví dụ "${e.en || e.vi}" thiếu vế EN hoặc VI (ngăn bằng " — ")`);
    if (c.mistake && (!c.mistake.wrong || !c.mistake.right)) err(`${tag}: "Hay sai" phải dạng sai → đúng`);
    for (const o of ctx.others) {
      if (o.id === card.id) continue;
      if (o.chunks.some((k) => norm(k.headword) === norm(c.headword))) warn(`${tag} đã dạy ở ${o.id} — đổi chunk khác nếu không cố ý ôn lại`);
    }
  }

  // ── trích dẫn ──
  const quotes = card.caption.match(QUOTE_RE) ?? [];
  if (quotes.length > 1) err(`có ${quotes.length} trích dẫn — tối đa 1`);
  for (const q of quotes) {
    if (words(q).length > 20) err(`trích dẫn quá dài (${words(q).length} từ, tối đa 20): ${q}`);
    else warn(`có trích dẫn ${q} — kiểm: đúng nguyên văn sách, ghi tác giả trong câu`);
  }

  // ── chép sách ──
  if (ctx.sources.length === 0) warn("không có bản nguồn trong content-src/ → chưa soát được chuyện chép chữ sách");
  copyChecks("đoạn văn", card.caption.replace(QUOTE_RE, " "), ctx.sources, out);

  // ── hình ──
  if (!ctx.sketch) err(`thiếu file hình ${card.sketchFile || "(chưa ghi File: trong ## Hình)"}`);
  else {
    if (!ctx.sketch.alt || ctx.sketch.alt.length < 10) err("hình: alt (mô tả tiếng Việt) quá ngắn");
    const labels = ctx.sketch.steps.filter((s) => s.kind === "text").map((s) => s.text ?? "");
    // chữ trong hình ngắn → chặt hơn: trùng sách từ 4 chữ liền là lỗi
    for (const l of labels) copyChecks(`chữ trong hình "${l}"`, l, ctx.sources, out, COPY_WARN_WORDS);
  }
  return out;
}
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// ───────── sổ thẻ ─────────

export function ledgerTable(cards: Card[]): string {
  const sorted = [...cards].sort((a, b) => (a.range && b.range ? cmpPos(a.range.from, b.range.from) : a.id.localeCompare(b.id)));
  const rows = sorted.map(
    (c) =>
      `| ${c.id} | ${c.range ? fmtRange(c.range) : c.rangeText} | ${c.idea || "—"} | ${c.chunks.map((k) => k.headword).join(" · ") || "—"} | ${STATES[c.state] ?? "?"} |`,
  );
  return ["| Thẻ | Nguồn | Ý | Chunk | Trạng thái |", "|---|---|---|---|---|", ...rows].join("\n");
}

export function parseSkipped(ledger: string): Skipped[] {
  const sec = ledger.split(/^## /m).find((p) => p.startsWith("Đoạn bỏ qua")) ?? "";
  const out: Skipped[] = [];
  for (const line of sec.split("\n")) {
    const m = line.match(/^-\s*(tr\.[^:—]+?)\s*[:—]\s*(.+)$/);
    const range = m && parseRange(m[1]);
    if (m && range) out.push({ range, reason: m[2].trim() });
  }
  return out;
}

// ───────── xem trước ─────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Step = { kind: string; [k: string]: unknown };

function arrowD(p: number[]): string {
  const [x1, y1, c1x, c1y, c2x, c2y, x2, y2] = p;
  const n = Math.hypot(x2 - c2x, y2 - c2y) || 1;
  const bx = (-(x2 - c2x) / n) * 8;
  const by = (-(y2 - c2y) / n) * 8;
  const rot = (a: number) => [bx * Math.cos(a) - by * Math.sin(a), bx * Math.sin(a) + by * Math.cos(a)];
  const [ax, ay] = rot(0.5);
  const [cx, cy] = rot(-0.5);
  return `M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2} M${x2 + ax},${y2 + ay} L${x2},${y2} L${x2 + cx},${y2 + cy}`;
}

export function sketchSvg(sk: SketchLike): string {
  const parts = (sk.steps as Step[]).map((s) => {
    const tone = String(s.tone ?? "line");
    if (s.kind === "path") return `<path class="${tone}" d="${esc(String(s.d))}" stroke-width="${s.width ?? 2}"/>`;
    if (s.kind === "arrow") return `<path class="ink" d="${arrowD(s.points as number[])}"/>`;
    if (s.kind === "ellipse") return `<ellipse class="${tone}" cx="${s.cx}" cy="${s.cy}" rx="${Number(s.w) / 2}" ry="${Number(s.h) / 2}"/>`;
    if (s.kind === "text")
      return `<text class="${tone}" x="${s.x}" y="${s.y}" font-size="${s.size}" text-anchor="${s.anchor ?? "start"}">${esc(String(s.text))}</text>`;
    return "";
  });
  return `<svg class="sk" viewBox="${esc(sk.viewBox)}" role="img" aria-label="${esc(sk.alt)}">${parts.join("")}</svg>`;
}

function underline(caption: string, chunks: CardChunk[]): string {
  const marks = chunks
    .map((c, i) => ({ i, at: caption.indexOf(c.match), len: c.match.length }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at);
  let html = "";
  let pos = 0;
  marks.forEach((m, k) => {
    html += esc(caption.slice(pos, m.at)) + `<u>${esc(caption.slice(m.at, m.at + m.len))}</u><sup>${k + 1}</sup>`;
    pos = m.at + m.len;
  });
  return html + esc(caption.slice(pos));
}

export function previewHtml(card: Card, sketch: SketchLike | null, book: { title: string; author: string }): string {
  const chunks = card.chunks
    .map(
      (c, i) => `<section class="ck"><h3>${i + 1}. ${esc(c.headword)} <small>— ${esc(c.label)}</small></h3>
<p>${esc(c.meaning)}</p>${c.pattern ? `<p class="pt">${esc(c.pattern.formula)}${c.pattern.note ? ` <small>— ${esc(c.pattern.note)}</small>` : ""}</p>` : ""}
<ul>${c.examples.map((e) => `<li>${esc(e.en)}<br><small>${esc(e.vi)}</small></li>`).join("")}</ul>
${c.mistake ? `<p class="ms"><s>${esc(c.mistake.wrong)}</s> → ${esc(c.mistake.right)}</p>` : ""}</section>`,
    )
    .join("\n");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(card.id)} xem trước</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f3ec;--text:#44403c;--bright:#1c1917;--muted:#6f6862;--line:#e2dccd;--ink:#b45309;--accent:#b45309;}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0f1317;--text:#d6dee6;--bright:#e6edf3;--muted:#7d8590;--line:#1f262e;--ink:#e3b341;--accent:#3fb950;}}
:root[data-theme=dark]{--bg:#0f1317;--text:#d6dee6;--bright:#e6edf3;--muted:#7d8590;--line:#1f262e;--ink:#e3b341;--accent:#3fb950;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.65 "IBM Plex Mono",monospace}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}.meta{color:var(--muted);font-size:12px}
.grid{display:grid;gap:28px;grid-template-columns:1fr}@media(min-width:900px){.grid{grid-template-columns:1fr 1fr}}
.lbl{color:var(--muted);font-size:13px;margin:18px 0 6px}.lbl.acc{color:var(--accent)}
svg.sk{width:100%;height:auto;display:block}
.sk path,.sk ellipse{fill:none;stroke-linecap:round;stroke-linejoin:round}.sk .line{stroke:var(--text)}.sk .ink{stroke:var(--ink)}.sk .accent{stroke:var(--accent)}
.sk text{font-family:"Patrick Hand",cursive;paint-order:stroke;stroke:var(--bg);stroke-width:5px;stroke-linejoin:round}
.sk text.line{fill:var(--text)}.sk text.name{fill:var(--bright)}.sk text.ink{fill:var(--ink)}.sk text.accent{fill:var(--accent)}
.cap{font-size:16px;color:var(--text)}u{text-decoration-color:var(--accent);text-underline-offset:4px}sup{color:var(--accent);font-size:10px}
.ck{border-top:1px solid var(--line);padding-top:10px;margin-top:14px}.ck h3{font-size:14px;margin:0 0 4px}.ck small{color:var(--muted);font-weight:400}
.pt{color:var(--accent)}.ms s{color:var(--muted)}ul{padding-left:18px}.credit{color:var(--muted);font-size:12px;font-style:italic;margin-top:18px}
</style></head><body><main>
<p class="meta">${esc(card.id)} · ${esc(STATES[card.state] ?? "")} · nguồn ${esc(card.rangeText)} · ý: ${esc(card.idea)}</p>
<div class="grid"><div>
<div class="lbl">// hình</div>${sketch ? sketchSvg(sketch) : "<p class='meta'>(chưa có hình)</p>"}
<div class="lbl">// mô tả</div><p class="cap">${underline(card.caption, card.chunks)}</p>
</div><div>
<div class="lbl">// bản dịch</div><p>${esc(card.translation)}</p>
<div class="lbl acc">// ý chính</div><p>${esc(card.mainIdea)}</p>
<p class="credit">Ý tưởng từ chương ${card.chapter}, <i>${esc(book.title)}</i> — ${esc(book.author)}. Hình và lời: takeiteasy.</p>
<div class="lbl">// chunk</div>${chunks}
</div></div></main></body></html>`;
}

// ───────── đọc ổ đĩa + lệnh ─────────

const ROOT = process.cwd();
const DOCS = join(ROOT, "docs/content");
const SRC = join(ROOT, "content-src");

type BookData = { id: string; title: string; author: string; ledgerPath: string; ledger: string; cards: Card[]; sources: string[] };

function loadBooks(): BookData[] {
  if (!existsSync(DOCS)) return [];
  return readdirSync(DOCS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(DOCS, d.name);
      const ledgerPath = join(dir, "SO-THE.md");
      const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, "utf8") : "";
      const cardsDir = join(dir, "cards");
      const cards = existsSync(cardsDir)
        ? readdirSync(cardsDir)
            .filter((f) => f.endsWith(".md"))
            .sort()
            .map((f) => parseCard(readFileSync(join(cardsDir, f), "utf8"), join(cardsDir, f)))
        : [];
      const srcDir = join(SRC, d.name);
      const sources = existsSync(srcDir)
        ? readdirSync(srcDir)
            .filter((f) => /\.(md|txt)$/.test(f))
            .map((f) => readFileSync(join(srcDir, f), "utf8"))
        : [];
      return {
        id: d.name,
        title: ledger.match(/^- Tên sách:\s*(.+)$/m)?.[1].trim() ?? d.name,
        author: ledger.match(/^- Tác giả:\s*(.+)$/m)?.[1].trim() ?? "",
        ledgerPath,
        ledger,
        cards,
        sources,
      };
    });
}

function loadSketch(card: Card): SketchLike | null {
  if (!card.sketchFile) return null;
  const p = join(card.file, "..", card.sketchFile);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as SketchLike) : null;
}

function findCard(id: string): { book: BookData; card: Card } {
  for (const book of loadBooks()) {
    const card = book.cards.find((c) => c.id === id);
    if (card) return { book, card };
  }
  throw new Error(`không thấy thẻ ${id} trong docs/content/*/cards/`);
}

function writePreview(book: BookData, card: Card): string {
  const dir = join(ROOT, ".content-preview");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${card.id}.html`);
  writeFileSync(out, previewHtml(card, loadSketch(card), book));
  return out;
}

/** Đo bằng trình duyệt thật: chữ trong hình phải cách mọi nét ≥ pad đơn vị. */
async function labelClashes(htmlPath: string, pad = 6): Promise<string[]> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href);
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate((PAD) => {
      const out: string[] = [];
      const svg = document.querySelector("svg.sk");
      if (!svg) return out;
      const shapes = [...svg.querySelectorAll("path, ellipse")] as SVGGeometryElement[];
      const pts = shapes.map((p) => {
        const L = p.getTotalLength();
        const arr: DOMPoint[] = [];
        for (let t = 0; t <= L; t += 1) arr.push(p.getPointAtLength(t));
        return { d: (p.getAttribute("d") ?? "ellipse").slice(0, 28), arr };
      });
      const texts = [...svg.querySelectorAll("text")];
      texts.forEach((t, i) => {
        const b = t.getBBox();
        const inBox = (x: number, y: number, q: DOMRect, padding: number) =>
          x > q.x - padding && x < q.x + q.width + padding && y > q.y - padding && y < q.y + q.height + padding;
        for (const p of pts) {
          if (p.arr.some((pt) => inBox(pt.x, pt.y, b, PAD))) out.push(`chữ "${t.textContent}" cách nét "${p.d}…" < ${PAD}`);
        }
        texts.slice(i + 1).forEach((u) => {
          const c = u.getBBox();
          // khung chữ có đệm trên/dưới → chỉ tính là đè khi phần giao cao > 35% dòng (xếp dòng sát nhau vẫn hợp lệ)
          const overlapY = Math.min(b.y + b.height, c.y + c.height) - Math.max(b.y, c.y);
          if (b.x < c.x + c.width + 2 && c.x < b.x + b.width + 2 && overlapY > 0.35 * Math.min(b.height, c.height))
            out.push(`chữ "${t.textContent}" chồng lên chữ "${u.textContent}"`);
        });
      });
      return out;
    }, pad);
  } finally {
    await browser.close();
  }
}

function nextId(book: BookData, chapter: number): string {
  const prefix = `ch${String(chapter).padStart(2, "0")}-t`;
  const nums = book.cards.filter((c) => c.id.startsWith(prefix)).map((c) => Number(c.id.slice(prefix.length)));
  return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
}

async function main(argv: string[]) {
  const [cmd = "status", ...rest] = argv;
  const flags = new Set(rest.filter((a) => a.startsWith("--")));
  const args = rest.filter((a) => !a.startsWith("--"));
  const books = loadBooks();

  if (cmd === "status") {
    for (const b of books) {
      const covered = b.cards.filter((c) => c.range).sort((x, y) => cmpPos(x.range!.from, y.range!.from));
      const last = covered.at(-1);
      const chapters = [...new Set(b.cards.map((c) => c.chapter))].sort((x, y) => x - y);
      console.log(`📚 ${b.title} (${b.id}) — ${b.cards.length} thẻ, ${b.sources.length} file nguồn`);
      console.log(`   đã phủ tới: ${last ? `${fmtRange(last.range!)} (${last.id})` : "chưa có"}`);
      for (const c of b.cards.filter((c) => c.state < 6)) console.log(`   đang dở: ${c.id} · ${STATES[c.state]} · ${c.rangeText} · ${c.idea || "—"}`);
      const waiting = b.cards.filter((c) => c.state === 6).map((c) => c.id);
      if (waiting.length) console.log(`   đã soát, chờ vào app: ${waiting.join(", ")}`);
      const inbox = join(SRC, b.id, "_cho");
      const pending = existsSync(inbox) ? readdirSync(inbox).filter((f) => !f.startsWith(".")) : [];
      if (pending.length) console.log(`   chữ sách đang chờ (chưa vào thẻ): ${pending.map((f) => `content-src/${b.id}/_cho/${f}`).join(", ")}`);
      if (/\(Minh ghi/.test(b.ledger)) console.log("   ⚠ SO-THE.md chưa ghi bản sách giấy dùng để đánh số trang — hỏi Minh");
      for (const s of parseSkipped(b.ledger)) console.log(`   bỏ qua: ${fmtRange(s.range)} — ${s.reason}`);
      for (const ch of chapters.length ? chapters : [1]) console.log(`   id thẻ kế tiếp chương ${ch}: ${nextId(b, ch)}`);
    }
    return 0;
  }

  if (cmd === "new") {
    const [chArg, rangeArg, bookArg] = args;
    const range = parseRange(rangeArg ?? "");
    if (!Number(chArg) || !range) throw new Error('dùng: npm run content -- new <chương> "tr.3¶1 – tr.4¶2" [sách]');
    if (!bookArg && books.length !== 1) throw new Error(`có ${books.length} sách — ghi thêm id sách ở cuối lệnh`);
    const b = bookArg ? books.find((x) => x.id === bookArg) : books[0];
    if (!b) throw new Error(`không thấy sách ${bookArg}`);
    const clashes = [
      ...b.cards.filter((c) => c.range && rangesOverlap(range, c.range)).map((c) => `thẻ ${c.id} (${fmtRange(c.range!)} · ${STATES[c.state]} · ${c.idea || "—"})`),
      ...parseSkipped(b.ledger).filter((s) => rangesOverlap(range, s.range)).map((s) => `đoạn bỏ qua ${fmtRange(s.range)} (${s.reason})`),
    ];
    if (clashes.length) {
      console.log(`✗ ${fmtRange(range)} trùng — KHÔNG tạo thẻ:`);
      for (const c of clashes) console.log(`   ${c}`);
      const free = uncoveredParts(range, [...b.cards.flatMap((c) => (c.range ? [c.range] : [])), ...parseSkipped(b.ledger).map((s) => s.range)]);
      console.log(free.length ? `   chưa ai phủ: ${free.join("; ")}` : "   cả khoảng đã được phủ hết");
      return 1;
    }
    const id = nextId(b, Number(chArg));
    const tpl = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../.claude/skills/bien-tap/mau-the.md"), "utf8");
    const cardPath = join(DOCS, b.id, "cards", `${id}.md`);
    mkdirSync(join(cardPath, ".."), { recursive: true });
    writeFileSync(cardPath, newCardMd(tpl, id, range, new Date().toISOString().slice(0, 10)));
    console.log(`✓ tạo ${cardPath}`);
    console.log(`   chép chữ sách vào: content-src/${b.id}/${id}.md (mỗi đoạn mở đầu [tr.N ¶k])`);
    return 0;
  }

  if (cmd === "ledger") {
    for (const b of books) {
      if (!b.ledger.includes("<!-- auto:start -->")) throw new Error(`${b.ledgerPath} thiếu dấu <!-- auto:start --> … <!-- auto:end -->`);
      const next = b.ledger.replace(/<!-- auto:start -->[\s\S]*?<!-- auto:end -->/, `<!-- auto:start -->\n${ledgerTable(b.cards)}\n<!-- auto:end -->`);
      writeFileSync(b.ledgerPath, next);
      console.log(`✓ ghi lại bảng thẻ ${b.ledgerPath}`);
    }
    return 0;
  }

  if (cmd === "preview") {
    if (!args[0]) throw new Error("cần id thẻ: npm run content -- preview ch01-t02");
    const { book, card } = findCard(args[0]);
    console.log(writePreview(book, card));
    return 0;
  }

  if (cmd === "check") {
    let failed = false;
    for (const b of books) {
      const skipped = parseSkipped(b.ledger);
      const auto = b.ledger.match(/<!-- auto:start -->\n?([\s\S]*?)\n?<!-- auto:end -->/)?.[1].trim();
      if (auto !== undefined && auto !== ledgerTable(b.cards)) console.log(`⚠ ${b.id}: bảng trong SO-THE.md cũ — chạy: npm run content -- ledger`);
      for (const card of b.cards.filter((c) => !args[0] || c.id === args[0])) {
        const r = checkCard(card, { others: b.cards, skipped, sources: b.sources, sketch: loadSketch(card) });
        const own = join(SRC, b.id, `${card.id}.md`);
        if (!existsSync(own)) r.warnings.push(`chưa có file nguồn content-src/${b.id}/${card.id}.md`);
        else if (card.range) {
          const m = checkSourceMarkers(readFileSync(own, "utf8"), card.range);
          r.errors.push(...m.errors);
          r.warnings.push(...m.warnings);
        }
        if (card.state >= 4 && !flags.has("--fast") && loadSketch(card)) {
          for (const m of await labelClashes(writePreview(b, card))) r.errors.push(`hình: ${m}`);
        }
        const mark = r.errors.length ? "✗" : r.warnings.length ? "⚠" : "✓";
        console.log(`${mark} ${card.id} · ${STATES[card.state] ?? "?"}`);
        for (const e of r.errors) console.log(`   ✗ ${e}`);
        for (const w of r.warnings) console.log(`   ⚠ ${w}`);
        failed ||= r.errors.length > 0;
      }
    }
    if (books.length === 0) console.log("chưa có sách nào trong docs/content/");
    return failed ? 1 : 0;
  }

  throw new Error(`lệnh không rõ "${cmd}" — dùng: status | new <chương> "<nguồn>" | check [id] [--fast] | preview <id> | ledger`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
      process.exit(2);
    },
  );
}
