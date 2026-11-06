import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeAudio {
  static last: FakeAudio | null = null;
  static count = 0;
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  // kết quả cho lần play() kế tiếp (mặc định: phát được)
  static nextPlay: Promise<void> | null = null;
  play = vi.fn(() => {
    const r = FakeAudio.nextPlay ?? Promise.resolve();
    FakeAudio.nextPlay = null;
    return r;
  });
  pause = vi.fn();
  constructor() {
    FakeAudio.last = this;
    FakeAudio.count += 1;
  }
}

function stubSynth() {
  const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => []) };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      lang = "";
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    },
  );
  return synth;
}

type Player = typeof import("@/lib/audio/player");
let p: Player;
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(async () => {
  FakeAudio.last = null;
  FakeAudio.count = 0;
  FakeAudio.nextPlay = null;
  vi.stubGlobal("Audio", FakeAudio);
  vi.resetModules(); // audio dùng chung được tạo lười → mỗi test một bản mới
  p = await import("@/lib/audio/player");
});
afterEach(() => vi.unstubAllGlobals());

describe("audio player", () => {
  it("import khi chưa có Audio/window thì không throw (SSR)", async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    await expect(import("@/lib/audio/player")).resolves.toBeDefined();
  });

  it("play có src: phát file qua một audio dùng chung", () => {
    p.play("a", { src: "/x.mp3", text: "t" });
    expect(p.getPlaying()).toBe("a");
    expect(FakeAudio.last!.src.endsWith("/x.mp3")).toBe(true);
    expect(FakeAudio.last!.play).toHaveBeenCalledOnce();
    p.play("b", { src: "/y.mp3", text: "t" });
    expect(FakeAudio.count).toBe(1);
  });

  it("ended → null và báo listener", () => {
    const cb = vi.fn();
    p.subscribePlaying(cb);
    p.play("a", { src: "/x.mp3", text: "t" });
    expect(cb).toHaveBeenCalledTimes(1);
    FakeAudio.last!.onended!();
    expect(p.getPlaying()).toBeNull();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe thì không báo nữa", () => {
    const cb = vi.fn();
    const off = p.subscribePlaying(cb);
    off();
    p.play("a", { src: "/x.mp3", text: "t" });
    expect(cb).not.toHaveBeenCalled();
  });

  it("togglePlay hai lần: lần 2 pause và về null", () => {
    p.togglePlay("a", { src: "/x.mp3", text: "t" });
    expect(p.getPlaying()).toBe("a");
    p.togglePlay("a", { src: "/x.mp3", text: "t" });
    expect(FakeAudio.last!.pause).toHaveBeenCalled();
    expect(p.getPlaying()).toBeNull();
    expect(FakeAudio.last!.play).toHaveBeenCalledOnce();
  });

  it("togglePlay khoá khác thì chuyển sang khoá đó", () => {
    p.togglePlay("a", { src: "/x.mp3", text: "t" });
    p.togglePlay("b", { src: "/y.mp3", text: "t" });
    expect(p.getPlaying()).toBe("b");
  });

  it("đang phát a rồi play b: pause trước, getPlaying = b", () => {
    p.play("a", { src: "/x.mp3", text: "t" });
    const audio = FakeAudio.last!;
    expect(audio.pause).not.toHaveBeenCalled();
    p.play("b", { src: "/y.mp3", text: "t" });
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(p.getPlaying()).toBe("b");
  });

  it("ended của lượt cũ không đổi trạng thái lượt mới", () => {
    p.play("a", { src: "/x.mp3", text: "t" });
    const oldEnded = FakeAudio.last!.onended!;
    p.play("b", { src: "/y.mp3", text: "t" });
    oldEnded();
    expect(p.getPlaying()).toBe("b");
  });

  it("error của lượt cũ đến muộn: không chuyển giọng trình duyệt, không đổi lượt mới", () => {
    const synth = stubSynth();
    p.play("a", { src: "/x.mp3", text: "ta" });
    const oldError = FakeAudio.last!.onerror!;
    p.play("b", { src: "/y.mp3", text: "tb" });
    oldError();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(p.getPlaying()).toBe("b");
  });

  it("play() của lượt cũ bị từ chối (AbortError do pause) không ảnh hưởng lượt mới", async () => {
    const synth = stubSynth();
    FakeAudio.nextPlay = Promise.reject(new Error("AbortError"));
    p.play("a", { src: "/x.mp3", text: "ta" });
    p.play("b", { src: "/y.mp3", text: "tb" }); // thay lượt a trước khi promise từ chối kịp xử lý
    await flush();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(p.getPlaying()).toBe("b");
  });

  it("play() bị từ chối → giọng trình duyệt với text, vẫn đang phát; utterance onend → null", async () => {
    const synth = stubSynth();
    FakeAudio.nextPlay = Promise.reject(new Error("NotAllowedError"));
    p.play("a", { src: "/x.mp3", text: "hello" });
    await flush();
    expect(synth.speak).toHaveBeenCalledOnce();
    const u = synth.speak.mock.calls[0][0];
    expect(u.text).toBe("hello");
    expect(p.getPlaying()).toBe("a");
    u.onend();
    expect(p.getPlaying()).toBeNull();
  });

  it("play() bị từ chối rồi bắn error: speak chỉ 1 lần", async () => {
    const synth = stubSynth();
    FakeAudio.nextPlay = Promise.reject(new Error("x"));
    p.play("a", { src: "/x.mp3", text: "hello" });
    const onerror = FakeAudio.last!.onerror!; // giữ handler như trình duyệt vẫn có thể bắn
    await flush();
    onerror();
    await flush();
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it("error bắn trước rồi play() mới bị từ chối: speak chỉ 1 lần", async () => {
    const synth = stubSynth();
    let reject!: (e: Error) => void;
    FakeAudio.nextPlay = new Promise<void>((_, rj) => { reject = rj; });
    p.play("a", { src: "/x.mp3", text: "hello" });
    FakeAudio.last!.onerror!();
    reject(new Error("x"));
    await flush();
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it("file lỗi sau khi đã phát được một lúc (error muộn, lượt còn hiện tại) → chuyển giọng trình duyệt một lần", async () => {
    const synth = stubSynth();
    p.play("a", { src: "/x.mp3", text: "hello" });
    await flush(); // play() đã resolve, file đã phát
    const onerror = FakeAudio.last!.onerror!;
    onerror();
    onerror();
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(p.getPlaying()).toBe("a");
  });

  it("file lỗi + không có speechSynthesis → về null", async () => {
    p.play("a", { src: "/x.mp3", text: "hello" });
    FakeAudio.last!.onerror!();
    expect(p.getPlaying()).toBeNull();
  });

  it("play() từ chối + không có speechSynthesis → về null", async () => {
    FakeAudio.nextPlay = Promise.reject(new Error("x"));
    p.play("a", { src: "/x.mp3", text: "t" });
    await flush();
    expect(p.getPlaying()).toBeNull();
  });

  it("không src → đi thẳng speak, không đụng audio", () => {
    const synth = stubSynth();
    p.play("tts:hi", { text: "hi" });
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(synth.speak.mock.calls[0][0].text).toBe("hi");
    expect(FakeAudio.count).toBe(0);
    expect(p.getPlaying()).toBe("tts:hi");
    synth.speak.mock.calls[0][0].onend();
    expect(p.getPlaying()).toBeNull();
  });

  it("không src + không có speechSynthesis → null", () => {
    p.play("tts:hi", { text: "hi" });
    expect(p.getPlaying()).toBeNull();
  });

  it("onend của utterance cũ (do cancel khi đổi lượt) không xoá lượt mới", () => {
    const synth = stubSynth();
    p.play("a", { text: "one" });
    const oldU = synth.speak.mock.calls[0][0];
    p.play("b", { text: "two" });
    oldU.onend();
    oldU.onerror();
    expect(p.getPlaying()).toBe("b");
  });

  it("onend của utterance cũ không xoá lượt file mới", () => {
    const synth = stubSynth();
    p.play("a", { text: "one" });
    const oldU = synth.speak.mock.calls[0][0];
    p.play("b", { src: "/y.mp3", text: "two" });
    oldU.onend();
    expect(p.getPlaying()).toBe("b");
  });

  it("stopPlayback(prefix): chỉ dừng khi khoá bắt đầu bằng prefix", () => {
    p.play("caption:x", { src: "/x.mp3", text: "t" });
    p.stopPlayback("ex:");
    expect(p.getPlaying()).toBe("caption:x");
    expect(FakeAudio.last!.pause).not.toHaveBeenCalled();
    p.play("ex:y", { src: "/y.mp3", text: "t" });
    FakeAudio.last!.pause.mockClear();
    p.stopPlayback("ex:");
    expect(p.getPlaying()).toBeNull();
    expect(FakeAudio.last!.pause).toHaveBeenCalled();
  });

  it("stopPlayback(prefix) khi không phát gì: không làm gì", () => {
    const synth = stubSynth();
    p.stopPlayback("ex:");
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it("stopPlayback() gọi cả pause lẫn speechSynthesis.cancel", () => {
    const synth = stubSynth();
    p.play("a", { src: "/x.mp3", text: "t" });
    synth.cancel.mockClear();
    p.stopPlayback();
    expect(FakeAudio.last!.pause).toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalled();
    expect(p.getPlaying()).toBeNull();
  });

  it("bấm hai lần thật nhanh (play cùng khoá liên tiếp) không kẹt: ended của lượt sau → null", () => {
    p.play("a", { src: "/x.mp3", text: "t" });
    const first = FakeAudio.last!.onended!;
    p.play("a", { src: "/x.mp3", text: "t" });
    first(); // lượt cũ: bỏ qua
    expect(p.getPlaying()).toBe("a");
    FakeAudio.last!.onended!();
    expect(p.getPlaying()).toBeNull();
  });
});
