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
  const base = { container: { left: 100, top: 200, width: 600, height: 400 }, popup: { width: 220, height: 46 }, viewportWidth: 1024, minTop: 52 };
  it("mặc định: canh giữa, phía trên vùng chọn cách 10px", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 400, width: 100, height: 24 } })).toEqual({ left: 140, top: 144, below: false }));
  it("sát mép trái màn hình: kẹp để mép trái popup = 8px viewport", () =>
    expect(placePopup({ ...base, container: { ...base.container, left: 0 }, sel: { left: 2, top: 400, width: 40, height: 24 } }).left).toBe(8));
  it("sát mép phải: mép phải popup = viewportWidth - 8", () => {
    const r = placePopup({ ...base, sel: { left: 990, top: 400, width: 30, height: 24 } });
    expect(base.container.left + r.left + 220).toBe(1016);
  });
  it("trên không đủ chỗ (dưới minTop) thì lật xuống dưới vùng chọn", () =>
    expect(placePopup({ ...base, sel: { left: 300, top: 70, width: 100, height: 24 } })).toEqual({ left: 140, top: -96, below: true }));
});
