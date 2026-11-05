import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypingText } from "@/lib/useTypingText";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useTypingText", () => {
  it("gõ dần từng ký tự rồi done", () => {
    const { result } = renderHook(() => useTypingText("abc", { charMs: 10 }));
    expect(result.current.display).toBe("");
    expect(result.current.done).toBe(false);
    act(() => vi.runAllTimers());
    expect(result.current.display).toBe("abc");
    expect(result.current.done).toBe(true);
  });
  it("skip hiện toàn bộ ngay", () => {
    const { result } = renderHook(() => useTypingText("hello", { charMs: 10 }));
    act(() => result.current.skip());
    expect(result.current.display).toBe("hello");
    expect(result.current.done).toBe(true);
  });
  it("enabled=false hiện ngay không cần timer", () => {
    const { result } = renderHook(() => useTypingText("xyz", { enabled: false }));
    expect(result.current.display).toBe("xyz");
    expect(result.current.done).toBe(true);
  });
  it("đổi text thì gõ lại từ đầu", () => {
    const { result, rerender } = renderHook(({ t }) => useTypingText(t, { charMs: 10 }), {
      initialProps: { t: "one" },
    });
    act(() => vi.runAllTimers());
    rerender({ t: "two" });
    expect(result.current.done).toBe(false);
    act(() => vi.runAllTimers());
    expect(result.current.display).toBe("two");
  });
  it("đổi text: không lần vẽ nào vừa mang text mới vừa giữ số chữ đã gõ của text cũ", () => {
    const seen: string[] = [];
    const { rerender } = renderHook(
      ({ t }) => {
        const r = useTypingText(t, { charMs: 10 });
        seen.push(`${t}|${r.display}|${r.done}`);
        return r;
      },
      { initialProps: { t: "một đoạn dài đã gõ xong" } },
    );
    act(() => vi.runAllTimers());
    seen.length = 0;
    rerender({ t: "ngắn" });
    expect(seen[0]).toBe("ngắn||false");
  });
});
