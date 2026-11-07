import { describe, expect, it } from "vitest";
import { audioPath } from "@/lib/audio/audioPath";
import { DEFAULT_VOICE, VOICES, isVoiceId, voiceName } from "@/lib/audio/voices";

describe("audioPath", () => {
  it("ra đường dẫn /audio/<giọng>/<16 hex>.mp3", () => {
    expect(audioPath("will", "Hi")).toMatch(/^\/audio\/will\/[0-9a-f]{16}\.mp3$/);
  });
  it("gọi hai lần ra cùng kết quả", () => {
    expect(audioPath("will", "Hi")).toBe(audioPath("will", "Hi"));
  });
  it("đổi giọng hoặc đổi một ký tự thì mã khác", () => {
    const base = audioPath("will", "Hi");
    expect(audioPath("brian", "Hi").split("/").pop()).not.toBe(base.split("/").pop());
    expect(audioPath("will", "Hj")).not.toBe(base);
  });
  it("chữ có dấu / emoji vẫn ra 16 hex", () => {
    expect(audioPath("sarah", "Café — 日本 😀")).toMatch(/^\/audio\/sarah\/[0-9a-f]{16}\.mp3$/);
  });
  // Chốt thuật toán: đổi thuật toán = phải tạo lại toàn bộ audio.
  it("giá trị cố định cho (will, Hi)", () => {
    expect(audioPath("will", "Hi")).toBe("/audio/will/48d0303a4d0ed081.mp3");
  });
});

describe("VOICES", () => {
  it("đúng thứ tự hiển thị", () => {
    expect(VOICES.map((v) => v.id)).toEqual(["will", "brian", "adam", "sarah", "jessica"]);
  });
  it("câu nghe thử chứa tên giọng", () => {
    for (const v of VOICES) expect(v.sample).toContain(v.name);
  });
  it("mặc định là will, isVoiceId / voiceName", () => {
    expect(DEFAULT_VOICE).toBe("will");
    expect(isVoiceId("sarah")).toBe(true);
    expect(isVoiceId("bob")).toBe(false);
    expect(isVoiceId(null)).toBe(false);
    expect(voiceName("jessica")).toBe("Jessica");
  });
});
