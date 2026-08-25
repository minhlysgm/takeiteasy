import { beforeEach, describe, expect, it } from "vitest";
import { getProgress, saveProgress } from "@/lib/progress";

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("null khi chưa có gì", () => {
    expect(getProgress()).toBeNull();
  });
  it("lưu và đọc lại", () => {
    saveProgress({ bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 3 });
    expect(getProgress()).toEqual({ bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 3 });
  });
  it("null khi dữ liệu hỏng", () => {
    localStorage.setItem("tie:progress", "{not json");
    expect(getProgress()).toBeNull();
    localStorage.setItem("tie:progress", JSON.stringify({ bookId: 1 }));
    expect(getProgress()).toBeNull();
  });
});
