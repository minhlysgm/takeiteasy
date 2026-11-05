import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSketchSeen, markSketchSeen } from "@/lib/sketchSeen";

describe("sketchSeen", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("chưa xem thì false, mark xong thì true và lưu khoá tie:sketch-seen:<id>", () => {
    expect(isSketchSeen("ch01-p01")).toBe(false);
    markSketchSeen("ch01-p01");
    expect(isSketchSeen("ch01-p01")).toBe(true);
    expect(localStorage.getItem("tie:sketch-seen:ch01-p01")).toBe("1");
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
