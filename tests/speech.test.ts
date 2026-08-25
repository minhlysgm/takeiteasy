import { afterEach, describe, expect, it, vi } from "vitest";
import { isSpeechAvailable, speak } from "@/lib/speech";

function stubSynth(voices: Partial<SpeechSynthesisVoice>[] = []) {
  const synth = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => voices as SpeechSynthesisVoice[]),
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      lang = "";
      rate = 1;
      voice: unknown = null;
      constructor(text: string) { this.text = text; }
    },
  );
  return synth;
}

afterEach(() => vi.unstubAllGlobals());

describe("speech", () => {
  it("isSpeechAvailable false khi không có speechSynthesis", () => {
    expect(isSpeechAvailable()).toBe(false);
  });
  it("speak không throw khi không có speechSynthesis", () => {
    expect(() => speak("hello")).not.toThrow();
  });
  it("speak cancel trước rồi speak, rate mặc định 0.9, lang en-US", () => {
    const synth = stubSynth();
    speak("hello world");
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledOnce();
    const u = synth.speak.mock.calls[0][0];
    expect(u.text).toBe("hello world");
    expect(u.rate).toBe(0.9);
    expect(u.lang).toBe("en-US");
  });
  it("ưu tiên voice en-US rồi en-GB", () => {
    const gb = { lang: "en-GB" };
    const synth = stubSynth([{ lang: "vi-VN" }, gb]);
    speak("hi");
    expect(synth.speak.mock.calls[0][0].voice).toBe(gb);
  });
});
