import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSketchSeen, markSketchSeen, SKETCH_SEEN_BOOT_SCRIPT, sketchGateCss, sketchSeenKey } from "@/lib/sketchSeen";

describe("sketchSeen", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("chưa xem thì false, mark xong thì true và lưu khoá tie:sketch-seen:v2:<id>", () => {
    expect(isSketchSeen("ch01-p01")).toBe(false);
    markSketchSeen("ch01-p01");
    expect(isSketchSeen("ch01-p01")).toBe(true);
    expect(localStorage.getItem("tie:sketch-seen:v2:ch01-p01")).toBe("1");
    expect(sketchSeenKey("ch01-p01")).toBe("tie:sketch-seen:v2:ch01-p01");
  });

  it("khoá cũ (chưa có version, thẻ cùng id nhưng nội dung đã thay) không tính là đã xem", () => {
    localStorage.setItem("tie:sketch-seen:ch01-p01", "1");
    expect(isSketchSeen("ch01-p01")).toBe(false);
  });

  it("các passage độc lập nhau", () => {
    markSketchSeen("ch01-p01");
    expect(isSketchSeen("ch01-p02")).toBe(false);
  });

  it("getItem ném lỗi thì isSketchSeen trả false (vẫn vẽ)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isSketchSeen("ch01-p01")).toBe(false);
  });

  it("setItem ném lỗi thì markSketchSeen không ném", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markSketchSeen("ch01-p01")).not.toThrow();
  });

  it("script đầu trang ghi các thẻ đã xem (khoá v2 = \"1\") vào <html data-sketch-seen>", () => {
    markSketchSeen("ch01-p01");
    markSketchSeen("ch01-p03");
    localStorage.setItem("tie:sketch-seen:ch01-p02", "1"); // khoá cũ: bỏ qua
    localStorage.setItem(sketchSeenKey("ch01-p04"), "0");
    new Function(SKETCH_SEEN_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.sketchSeen!.split(" ").sort()).toEqual(["ch01-p01", "ch01-p03"]);
    delete document.documentElement.dataset.sketchSeen;
  });

  it("script đầu trang: storage bị chặn thì không ném lỗi", () => {
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("blocked");
    });
    markSketchSeen("ch01-p01");
    expect(() => new Function(SKETCH_SEEN_BOOT_SCRIPT)()).not.toThrow();
  });

  it("CSS lúc chưa hydrate: chọn theo id thẻ trong data-sketch-seen; id lạ thì không sinh CSS", () => {
    const css = sketchGateCss("ch01-p01");
    expect(css).toContain('html[data-sketch-seen~="ch01-p01"] [data-sketch-gate] .gate-wait{display:none}');
    expect(css).toContain(".gate-full{display:block}");
    expect(css).toContain(".sketch-art-idle{opacity:1}");
    expect(sketchGateCss('x"]{}</style>')).toBe("");
  });
});
