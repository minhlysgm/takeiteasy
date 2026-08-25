import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTheme } from "@/lib/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("mặc định dark và gắn data-theme", () => {
    renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("toggle sang light, lưu localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("tie:theme")).toBe("light");
  });
  it("đọc lại theme đã lưu", () => {
    localStorage.setItem("tie:theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });
});
