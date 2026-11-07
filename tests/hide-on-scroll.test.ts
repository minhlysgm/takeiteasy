import { describe, expect, it } from "vitest";
import { stepHideOnScroll } from "@/lib/useHideOnScroll";

describe("stepHideOnScroll", () => {
  const s0 = { hidden: false, anchor: 0 };
  it("gần đầu trang (≤ 44px) luôn hiện", () => {
    expect(stepHideOnScroll({ hidden: true, anchor: 300 }, 40)).toEqual({ hidden: false, anchor: 40 });
  });
  it("cuộn xuống quá ngưỡng thì ẩn", () => {
    expect(stepHideOnScroll({ hidden: false, anchor: 100 }, 120)).toEqual({ hidden: true, anchor: 120 });
  });
  it("cuộn lên quá ngưỡng thì hiện", () => {
    expect(stepHideOnScroll({ hidden: true, anchor: 600 }, 580)).toEqual({ hidden: false, anchor: 580 });
  });
  it("rung nhẹ dưới ngưỡng thì giữ nguyên, không dời mốc", () => {
    expect(stepHideOnScroll({ hidden: true, anchor: 600 }, 596)).toEqual({ hidden: true, anchor: 600 });
    expect(stepHideOnScroll({ hidden: false, anchor: 600 }, 604)).toEqual({ hidden: false, anchor: 600 });
  });
  it("trang ngắn, cuộn từ 0 xuống 30 thì vẫn hiện", () => {
    expect(stepHideOnScroll(s0, 30)).toEqual({ hidden: false, anchor: 30 });
  });
});
