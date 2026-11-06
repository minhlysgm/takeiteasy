import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSketchSeen, markSketchSeen, sketchSeenKey } from "@/lib/sketchSeen";

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
});
