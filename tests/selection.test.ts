import { describe, expect, it } from "vitest";
import { canLookUp, lookupUrl, normalizeSelectionText, placePopup } from "@/lib/selection";

describe("normalizeSelectionText", () => {
  it("gộp khoảng trắng và xuống dòng", () => expect(normalizeSelectionText("  chronic\n  gambler ")).toBe("chronic gambler"));
  it("chỉ dấu câu / khoảng trắng → rỗng", () => expect(normalizeSelectionText(" , — . ")).toBe(""));
});

describe("canLookUp", () => {
  it("5 từ thì tra được", () => expect(canLookUp("look to sb for sth")).toBe(true)); // 5 từ
  it("6 từ thì không", () => expect(canLookUp("Charles Bukowski was an alcoholic, a")).toBe(false));
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
