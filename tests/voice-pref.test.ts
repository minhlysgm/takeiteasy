import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VOICE_KEY, getVoice, setVoice, useVoice } from "@/lib/audio/voicePref";

describe("voicePref", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("chưa lưu thì là will", () => {
    expect(getVoice()).toBe("will");
  });
  it("setVoice lưu và getVoice đọc lại", () => {
    setVoice("sarah");
    expect(getVoice()).toBe("sarah");
    expect(localStorage.getItem("tie:voice")).toBe("sarah");
    expect(VOICE_KEY).toBe("tie:voice");
  });
  it("giá trị lạ thì về will", () => {
    localStorage.setItem("tie:voice", "bob");
    expect(getVoice()).toBe("will");
  });
  it("getItem ném lỗi thì về will", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getVoice()).toBe("will");
  });
  it("setItem ném lỗi thì không ném ra ngoài", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => setVoice("adam")).not.toThrow();
  });
  it("useVoice đổi theo sau setVoice", () => {
    const { result } = renderHook(() => useVoice());
    expect(result.current).toBe("will");
    act(() => setVoice("adam"));
    expect(result.current).toBe("adam");
  });
  it("useVoice đổi khi tab khác ghi (sự kiện storage)", () => {
    const { result } = renderHook(() => useVoice());
    act(() => {
      localStorage.setItem("tie:voice", "brian");
      window.dispatchEvent(new StorageEvent("storage", { key: "tie:voice" }));
    });
    expect(result.current).toBe("brian");
  });
});
