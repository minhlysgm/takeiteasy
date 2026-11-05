import { describe, expect, it } from "vitest";
import { getPassages } from "@/lib/content";
import { canLookUp, chunkAt, lookupUrl, normalizeSelectionText, placePopup, sentenceAt } from "@/lib/selection";

describe("normalizeSelectionText", () => {
  it("gộp khoảng trắng và xuống dòng", () => expect(normalizeSelectionText("  chronic\n  gambler ")).toBe("chronic gambler"));
  it("chỉ dấu câu / khoảng trắng → rỗng", () => expect(normalizeSelectionText(" , — . ")).toBe(""));
});

describe("canLookUp", () => {
  it("10 từ thì tra được", () =>
    expect(canLookUp("Charles Bukowski was an alcoholic, a womanizer, a chronic gambler,")).toBe(true));
  it("11 từ thì không", () =>
    expect(canLookUp("Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a")).toBe(false));
  it("≤ 10 từ nhưng quá 120 ký tự → false; đúng 120 → true", () => {
    expect(canLookUp("x".repeat(121))).toBe(false);
    expect(canLookUp("x".repeat(120))).toBe(true);
  });
});

const p1 = getPassages("the-subtle-art", "ch01")![0];
const at = (s: string) => {
  const i = p1.original.indexOf(s);
  return [i, i + s.length] as const;
};

describe("sentenceAt", () => {
  it("câu chứa 'lout'", () =>
    expect(sentenceAt(p1.original, ...at("lout"))).toBe(
      "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout, a cheapskate, a deadbeat, and on his worst days, a poet.",
    ));
  it("câu đứng riêng sau dòng trống", () =>
    expect(sentenceAt(p1.original, ...at("perfect place"))).toBe("Which is why he's the perfect place to start."));
  it("câu dài quá 600 ký tự → cắt khung ≤ 600 quanh vùng chọn, vẫn chứa vùng chọn và vẫn nằm trong đoạn", () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`);
    const original = words.join(" ") + ".";
    for (const target of ["word0", "word100", "word199"]) {
      const s = original.indexOf(target + " ") >= 0 ? original.indexOf(target + " ") : original.indexOf(target + ".");
      const got = sentenceAt(original, s, s + target.length);
      expect(got.length).toBeLessThanOrEqual(600);
      expect(got).toContain(target);
      expect(original).toContain(got);
    }
  });
});

describe("chunkAt", () => {
  it("nằm trọn trong cụm → cụm đó; lấn ra ngoài → null", () => {
    expect(chunkAt(p1, ...at("chronic"))?.id).toBe("chronic");
    expect(chunkAt(p1, ...at("worst days"))?.id).toBe("on-his-worst-days");
    expect(chunkAt(p1, ...at("chronic gambler"))).toBeNull();
    expect(chunkAt(p1, ...at("lout"))).toBeNull();
  });
});

it("lookupUrl encode cụm", () =>
  expect(lookupUrl("one's worst days")).toBe("https://dictionary.cambridge.org/search/english/?q=one's%20worst%20days"));

describe("placePopup", () => {
  // Viewport 1024×900: header dính tới 52 (minTop), footer dính từ 836 (maxBottom).
  const base = {
    container: { left: 100, top: 200, width: 600, height: 400 },
    popup: { width: 220, height: 46 },
    viewportWidth: 1024,
    minTop: 52,
    maxBottom: 836,
    wantRoom: 320,
  };
  it("đủ chỗ cho thẻ phía trên: canh giữa, phía trên vùng chọn cách 10px; mép neo là mép dưới popup", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 500, width: 100, height: 24 } })).toEqual({
      left: 140,
      top: 244,
      below: false,
      anchor: 290, // 500 - 10 - 200: mép dưới popup, toạ độ container
      room: 438, // 500 - 10 - 52
    }));
  it("sát mép trái màn hình: kẹp để mép trái popup = 8px viewport", () =>
    expect(placePopup({ ...base, container: { ...base.container, left: 0 }, sel: { left: 2, top: 500, width: 40, height: 24 } }).left).toBe(8));
  it("sát mép phải: mép phải popup = viewportWidth - 8", () => {
    const r = placePopup({ ...base, sel: { left: 990, top: 500, width: 30, height: 24 } });
    expect(base.container.left + r.left + 220).toBe(1016);
  });
  it("phía trên chật hơn phía dưới và không đủ chỗ cho thẻ → xuống dưới; mép neo là mép trên popup", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 173, width: 100, height: 22 } })).toEqual({
      left: 140,
      top: 5, // 173 + 22 + 10 - 200
      below: true,
      anchor: 5,
      room: 631, // 836 - 205
    }));
  it("phía trên không đủ chỗ cho thẻ nhưng vẫn rộng hơn phía dưới → vẫn ở trên", () => {
    const r = placePopup({ ...base, sel: { left: 300, top: 300, width: 100, height: 24 }, maxBottom: 500 });
    expect(r.below).toBe(false);
    expect(r.room).toBe(238); // trên 238 < 320 nhưng dưới chỉ 500 - 334 = 166
  });
  it("phía trên không chứa nổi cả hàng nút (dưới minTop) → lật xuống dưới", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 70, width: 100, height: 24 } }).below).toBe(true));
});
