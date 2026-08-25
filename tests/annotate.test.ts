import { describe, expect, it } from "vitest";
import { buildArrowPath, layoutNotes } from "@/lib/annotate";

describe("buildArrowPath", () => {
  it("path cubic từ from tới to", () => {
    const d = buildArrowPath({ x: 200, y: 400 }, { x: 300, y: 200 });
    expect(d.startsWith("M 200 400 C ")).toBe(true);
    expect(d.endsWith("300 200")).toBe(true);
  });
});

describe("layoutNotes", () => {
  it("giữ nguyên khi không đè nhau", () => {
    expect(layoutNotes([
      { id: "a", y: 0, height: 50 },
      { id: "b", y: 100, height: 50 },
    ])).toEqual({ a: 0, b: 100 });
  });
  it("đẩy ghi chú sau xuống khi đè nhau (kèm gap)", () => {
    const out = layoutNotes([
      { id: "a", y: 0, height: 50 },
      { id: "b", y: 20, height: 50 },
    ], 10);
    expect(out.a).toBe(0);
    expect(out.b).toBe(60); // 0 + 50 + 10
  });
  it("input không cần sort sẵn", () => {
    const out = layoutNotes([
      { id: "b", y: 20, height: 50 },
      { id: "a", y: 0, height: 50 },
    ], 10);
    expect(out.a).toBe(0);
    expect(out.b).toBe(60);
  });
});
