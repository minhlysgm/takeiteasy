import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SKETCH_TEXT_HALO } from "@/lib/sketch/style";
import {
  uncoveredParts,
  checkCard,
  checkSourceMarkers,
  newCardMd,
  ledgerTable,
  parseCard,
  parseRange,
  previewHtml,
  rangesOverlap,
  sharedRuns,
  type Card,
} from "@/scripts/content/cards";

// Thẻ mẫu đủ chuẩn ở trạng thái ④ nháp (nội dung lấy từ bản nháp thẻ 1).
const OK_CARD = `---
id: ch01-t01
chuong: 1
nguon: tr.1¶1 – tr.2¶3
trang-thai: 4 nháp
y: Bukowski sống bê bết, bị từ chối mãi vẫn viết, không giả vờ
---

## Tóm ý tác giả
- Bukowski thất bại gần hết đời nhưng vẫn viết.

## Hướng kể
- A) Tả cảnh bàn viết bê bết ← chốt

## Hình
Cảnh: người gục bên bàn, chai rượu, vé cá ngựa, chồng thư từ chối.
File: ch01-t01.sketch.json

## Caption
This is Charles Bukowski, and his life is a mess. He drinks too much, bets his rent money on horse races, and the letters piling up on his desk all say the same thing: no thanks. Most people would give up. He just keeps writing, one bad poem after another, and never pretends to be anyone else.

## Bản dịch
Đây là Charles Bukowski, và đời ông bê bết.

## Ý chính
Không giả vờ là điểm mạnh.

## Chunk

### be a mess
- Khớp: is a mess
- Ghi chú lề: bừa bộn
- Nghĩa: lộn xộn, bê bết
- Ví dụ: My room is a mess after the party. — Phòng tui bừa bộn sau bữa tiệc.
- Ví dụ: The kitchen was a mess. — Bếp bừa tung.

### bet (money) on something
- Khớp: bets his rent money on
- Ghi chú lề: cá tiền vào
- Nghĩa: đặt cược tiền vào việc gì
- Mẫu: bet + tiền + on + thứ — tiền đặt vào đâu
- Ví dụ: He bet ten dollars on the game. — Anh ấy cá mười đô vào trận đấu.
- Ví dụ: Don't bet your savings on it. — Đừng cá hết tiền tiết kiệm vào đó.
- Hay sai: bet for the horse → bet on the horse

### pile up
- Khớp: piling up
- Ghi chú lề: chất đống
- Nghĩa: dồn lại thành đống
- Ví dụ: Dirty dishes are piling up in the sink. — Chén bẩn chất đống trong bồn.
- Ví dụ: The emails piled up while I was away. — Email dồn lại lúc tui đi vắng.

### give up
- Khớp: give up
- Ghi chú lề: bỏ cuộc
- Nghĩa: thôi không cố nữa
- Ví dụ: Don't give up on your diet yet. — Đừng bỏ chế độ ăn vội.
- Ví dụ: She gave up coffee last year. — Cô ấy bỏ cà phê từ năm ngoái.

## Nhật ký
- 2026-11-06 · Minh: chốt hướng A
`;

const SKETCH_OK = { viewBox: "0 0 520 340", alt: "Một người gục bên bàn viết.", steps: [{ kind: "path", d: "M0 0 L10 10", tone: "line" }, { kind: "text", text: "one more…", x: 10, y: 20, size: 21, tone: "ink" }] };

function card(md = OK_CARD, file = "ch01-t01.md"): Card {
  return parseCard(md, file);
}
const ctx = (over: Partial<Parameters<typeof checkCard>[1]> = {}) => ({
  others: [] as Card[],
  skipped: [],
  sources: [],
  sketch: SKETCH_OK,
  ...over,
});

describe("parseRange / rangesOverlap", () => {
  it("đọc khoảng trang ¶ có hoặc không có điểm cuối", () => {
    expect(parseRange("tr.3¶1 – tr.4¶2")).toEqual({ from: [3, 1], to: [4, 2] });
    expect(parseRange("tr.12¶2")).toEqual({ from: [12, 2], to: [12, 2] });
    expect(parseRange("tr.3¶1-tr.4¶2")).toEqual({ from: [3, 1], to: [4, 2] });
    expect(parseRange("tr. 3 ¶1 - tr.4 ¶ 2")).toEqual({ from: [3, 1], to: [4, 2] });
  });
  it("chuỗi sai hoặc khoảng ngược thì trả null", () => {
    expect(parseRange("trang 3")).toBeNull();
    expect(parseRange("tr.5¶1 – tr.4¶2")).toBeNull();
  });
  it("chạm nhau ở cùng một ¶ là trùng, liền kề thì không", () => {
    const a = parseRange("tr.3¶1 – tr.4¶2")!;
    expect(rangesOverlap(a, parseRange("tr.4¶2 – tr.5¶1")!)).toBe(true);
    expect(rangesOverlap(a, parseRange("tr.4¶3 – tr.5¶1")!)).toBe(false);
    expect(rangesOverlap(a, parseRange("tr.2¶9")!)).toBe(false);
  });
});

describe("parseCard", () => {
  it("đọc frontmatter, các mục và chunk", () => {
    const c = card();
    expect(c.id).toBe("ch01-t01");
    expect(c.state).toBe(4);
    expect(c.range).toEqual({ from: [1, 1], to: [2, 3] });
    expect(c.caption.startsWith("This is Charles Bukowski")).toBe(true);
    expect(c.sketchFile).toBe("ch01-t01.sketch.json");
    expect(c.chunks.map((k) => k.headword)).toEqual(["be a mess", "bet (money) on something", "pile up", "give up"]);
    const bet = c.chunks[1];
    expect(bet.match).toBe("bets his rent money on");
    expect(bet.examples).toHaveLength(2);
    expect(bet.examples[0]).toEqual({ en: "He bet ten dollars on the game.", vi: "Anh ấy cá mười đô vào trận đấu." });
    expect(bet.pattern).toEqual({ formula: "bet + tiền + on + thứ", note: "tiền đặt vào đâu" });
    expect(bet.mistake).toEqual({ wrong: "bet for the horse", right: "bet on the horse" });
  });
});

describe("sharedRuns", () => {
  it("bắt chuỗi chữ trùng bất kể hoa thường, dấu câu, nháy cong", () => {
    const src = "Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout. He didn’t care.";
    const runs = sharedRuns("They say he was an ALCOHOLIC a womanizer, and more. He didn't care.", src, 4);
    expect(runs).toEqual(["was an alcoholic a womanizer"]);
    expect(runs.every((r) => r.split(" ").length >= 4)).toBe(true);
  });
  it("không trùng thì rỗng", () => {
    expect(sharedRuns("Cats sleep all day long.", "Dogs bark at night.", 4)).toEqual([]);
  });
});

describe("checkCard", () => {
  it("thẻ chuẩn: không lỗi", () => {
    expect(checkCard(card(), ctx()).errors).toEqual([]);
  });

  it("id khác tên file → lỗi", () => {
    expect(checkCard(card(OK_CARD, "ch01-t02.md"), ctx()).errors.join("\n")).toMatch(/id/);
  });

  it("chép ≥ 6 chữ liền của sách → lỗi; 4–5 chữ → cảnh báo", () => {
    const src6 = "and the letters piling up on his desk were all rejections";
    expect(checkCard(card(), ctx({ sources: [src6] })).errors.join("\n")).toMatch(/chép/);
    const src4 = "his life is a mess, they said";
    const r = checkCard(card(), ctx({ sources: [src4] }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.join("\n")).toMatch(/his life is a mess/);
  });

  it("chữ trong hình chép sách → lỗi", () => {
    const sketch = { ...SKETCH_OK, steps: [...SKETCH_OK.steps, { kind: "text", text: "the perfect place to start", x: 1, y: 1, size: 21, tone: "ink" }] };
    expect(checkCard(card(), ctx({ sketch, sources: ["it is the perfect place to start, really"] })).errors.join("\n")).toMatch(/hình/);
  });

  it("chữ trong hình khác cỡ chuẩn (21) → cảnh báo", () => {
    const sketch = { ...SKETCH_OK, steps: [...SKETCH_OK.steps, { kind: "text", text: "rent", x: 1, y: 1, size: 17, tone: "ink" }] };
    expect(checkCard(card(), ctx({ sketch })).warnings.join("\n")).toMatch(/"rent".*cỡ 17.*21/);
    expect(checkCard(card(), ctx()).warnings.join("\n")).not.toMatch(/cỡ/);
  });

  it("phần trong ngoặc kép được miễn kiểm chép nhưng phải ngắn", () => {
    const quoted = OK_CARD.replace("Most people would give up.", 'As Manson puts it, "don\'t try" is the whole point. Most people would give up.');
    const r = checkCard(card(quoted), ctx({ sources: ["the secret is simple: don't try is the whole point here"] }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.join("\n")).toMatch(/trích/);
  });

  it("chunk không khớp đoạn văn → lỗi", () => {
    const bad = OK_CARD.replace("- Khớp: piling up", "- Khớp: piled up");
    expect(checkCard(card(bad), ctx()).errors.join("\n")).toMatch(/piled up/);
  });

  it("chunk thiếu ví dụ → lỗi", () => {
    const bad = OK_CARD.replace("- Ví dụ: She gave up coffee last year. — Cô ấy bỏ cà phê từ năm ngoái.\n", "");
    expect(checkCard(card(bad), ctx()).errors.join("\n")).toMatch(/give up.*ví dụ/);
  });

  it("đoạn văn quá ngắn → lỗi", () => {
    const short = OK_CARD.replace(/## Caption\n[^\n]+/, "## Caption\nThis is Charles Bukowski, and his life is a mess. Most people would give up. He bets his rent money on horses, with letters piling up.");
    expect(checkCard(card(short), ctx()).errors.join("\n")).toMatch(/từ/);
  });

  it("nguồn trùng thẻ khác hoặc đoạn đã bỏ qua → lỗi", () => {
    const other = card(OK_CARD.replace("id: ch01-t01", "id: ch01-t02").replace("nguon: tr.1¶1 – tr.2¶3", "nguon: tr.2¶3 – tr.3¶1"), "ch01-t02.md");
    expect(checkCard(card(), ctx({ others: [other] })).errors.join("\n")).toMatch(/ch01-t02/);
    expect(checkCard(card(), ctx({ skipped: [{ range: parseRange("tr.2¶1")!, reason: "chuyện riêng" }] })).errors.join("\n")).toMatch(/bỏ qua/);
  });

  it("chunk đã dạy ở thẻ khác → cảnh báo", () => {
    const other = card(OK_CARD.replace("id: ch01-t01", "id: ch01-t02").replace("nguon: tr.1¶1 – tr.2¶3", "nguon: tr.9¶1"), "ch01-t02.md");
    expect(checkCard(card(), ctx({ others: [other] })).warnings.join("\n")).toMatch(/give up.*ch01-t02/);
  });

  it("thiếu file hình ở trạng thái ≥ ④ → lỗi", () => {
    expect(checkCard(card(), ctx({ sketch: null })).errors.join("\n")).toMatch(/hình/);
  });

  it("trạng thái < ④ chỉ kiểm nguồn, chưa kiểm nội dung", () => {
    const early = `---\nid: ch01-t01\nchuong: 1\nnguon: tr.1¶1 – tr.2¶3\ntrang-thai: 1 nhận đoạn\ny:\n---\n`;
    expect(checkCard(card(early), ctx({ sketch: null })).errors).toEqual([]);
  });
});

describe("ledgerTable", () => {
  it("xếp theo nguồn, ghi trạng thái và chunk", () => {
    const t2 = card(OK_CARD.replace("id: ch01-t01", "id: ch01-t02").replace("nguon: tr.1¶1 – tr.2¶3", "nguon: tr.3¶1 – tr.4¶1"), "ch01-t02.md");
    const table = ledgerTable([t2, card()]);
    expect(table.indexOf("ch01-t01")).toBeLessThan(table.indexOf("ch01-t02"));
    expect(table).toContain("④ nháp");
    expect(table).toContain("be a mess · bet (money) on something · pile up · give up");
  });
});

describe("newCardMd", () => {
  it("điền id, chương, nguồn, ngày vào mẫu; trạng thái ①", () => {
    const tpl = "---\nid: ch01-t01\nchuong: 1\nnguon: tr.1¶1 – tr.2¶3\ntrang-thai: 1 nhận đoạn\ny:\n---\n\n## Hình\nFile: ch01-t01.sketch.json\n\n## Nhật ký\n- YYYY-MM-DD · ① nhận đoạn tr.… (Minh gửi ảnh/chữ)\n";
    const md = newCardMd(tpl, "ch02-t05", parseRange("tr.40¶2 – tr.41¶1")!, "2026-11-06");
    const c = parseCard(md, "ch02-t05.md");
    expect(c.id).toBe("ch02-t05");
    expect(c.chapter).toBe(2);
    expect(c.state).toBe(1);
    expect(c.rangeText).toBe("tr.40¶2 – tr.41¶1");
    expect(c.sketchFile).toBe("ch02-t05.sketch.json");
    expect(md).toContain("- 2026-11-06 · ① nhận đoạn tr.40¶2 – tr.41¶1");
    expect(md).not.toContain("ch01-t01");
  });
});

describe("checkSourceMarkers", () => {
  const r = parseRange("tr.3¶1 – tr.4¶1")!;
  it("đủ dấu, nằm trong khoảng → không lỗi", () => {
    expect(checkSourceMarkers("[tr.3 ¶1]\nabc\n\n[tr.3 ¶2]\ndef\n\n[tr.4 ¶1]\nxyz", r)).toEqual({ errors: [], warnings: [] });
  });
  it("có đoạn ngoài khoảng nguồn → lỗi", () => {
    expect(checkSourceMarkers("[tr.3 ¶1]\nabc\n\n[tr.4 ¶2]\nngoài", r).errors.join("\n")).toMatch(/tr\.4¶2/);
  });
  it("không có dấu nào → cảnh báo", () => {
    expect(checkSourceMarkers("chữ trơn không dấu", r).warnings.join("\n")).toMatch(/dấu/);
  });
});

describe("uncoveredParts", () => {
  it("chỉ ra phần trước / giữa / sau các thẻ đã phủ", () => {
    const want = parseRange("tr.1¶3 – tr.3¶1")!;
    expect(uncoveredParts(want, [parseRange("tr.1¶1 – tr.1¶3")!])).toEqual(["sau tr.1¶3, tới tr.3¶1"]);
    expect(uncoveredParts(want, [parseRange("tr.2¶1 – tr.2¶2")!])).toEqual(["từ tr.1¶3, trước tr.2¶1", "sau tr.2¶2, tới tr.3¶1"]);
    expect(uncoveredParts(want, [parseRange("tr.1¶1 – tr.4¶1")!])).toEqual([]);
  });
});

describe("previewHtml", () => {
  it("màu nét/chữ theo tone khớp app: line = text, ink = ink, accent = accent (accent khác ink)", () => {
    const html = previewHtml(parseCard(OK_CARD, "ch01-t01.md"), null, { title: "T", author: "A" });
    expect(html).toContain(".sk .line{stroke:var(--text)}");
    expect(html).toContain(".sk .ink{stroke:var(--ink)}");
    expect(html).toContain(".sk .accent{stroke:var(--accent)}");
    expect(html).toContain("text.line{fill:var(--text)}");
    expect(html).toContain("text.name{fill:var(--bright)}");
    expect(html).toContain("text.ink{fill:var(--ink)}");
    expect(html).toContain("text.accent{fill:var(--accent)}");
    expect(html).toMatch(/--bright:/);
  });

  it("màu đọc từ lib/theme.css (không chép cứng hex), theo theme máy; viền chữ trong hình khớp PassageSketch", () => {
    const html = previewHtml(parseCard(OK_CARD, "ch01-t01.md"), null, { title: "T", author: "A" });
    const theme = readFileSync("lib/theme.css", "utf8");
    for (const [, name, value] of theme.matchAll(/(--[\w-]+):\s*([^;]+);/g)) expect(html).toContain(`${name}: ${value};`);
    expect(html).toContain("@media (prefers-color-scheme: light){:root:not([data-theme=dark]){");
    // ngoài khối theme thì không có mã màu nào
    const rest = html
      .slice(html.indexOf("<style>"), html.indexOf("</style>"))
      .replace(theme, "")
      .replace(/@media \(prefers-color-scheme: light\)\{:root:not\(\[data-theme=dark\]\)\{[^}]*\}\}/, "");
    expect(rest).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(html).toContain(`stroke-width:${SKETCH_TEXT_HALO}px`);
    expect(SKETCH_TEXT_HALO).toBe(4);
  });
});
