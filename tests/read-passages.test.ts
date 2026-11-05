import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReadPassages, markPassageRead } from "@/lib/readPassages";

describe("readPassages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("chưa có gì → []", () => expect(getReadPassages("b", "c")).toEqual([]));
  it("mark rồi get, sắp xếp, không trùng, tách theo chương", () => {
    markPassageRead("b", "c", 2); markPassageRead("b", "c", 1); markPassageRead("b", "c", 2);
    markPassageRead("b", "other", 5);
    expect(getReadPassages("b", "c")).toEqual([1, 2]);
    expect(getReadPassages("b", "other")).toEqual([5]);
  });
  it("dữ liệu hỏng → [] và mark vẫn chạy", () => {
    localStorage.setItem("tie:read", "{oops");
    expect(getReadPassages("b", "c")).toEqual([]);
    markPassageRead("b", "c", 3);
    expect(getReadPassages("b", "c")).toEqual([3]);
    localStorage.setItem("tie:read", JSON.stringify({ "b/c": [1, "x", -2, 2.5, 4] }));
    expect(getReadPassages("b", "c")).toEqual([1, 4]);
  });
  it("localStorage ném lỗi → [] và không ném", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(getReadPassages("b", "c")).toEqual([]);
    expect(() => markPassageRead("b", "c", 1)).not.toThrow();
  });
});
