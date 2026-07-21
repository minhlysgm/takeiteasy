import { describe, it, expect } from "vitest";
import { stripName, speak } from "../lib/speech";

describe("speech", () => {
  it("strips {name} token", () => {
    expect(stripName("{name}, where are we on yesterday's task?"))
      .toBe("where are we on yesterday's task?");
  });
  it("leaves normal text alone", () => {
    expect(stripName("Before 12 — I'll ping you.")).toBe("Before 12 — I'll ping you.");
  });
  it("speak no-ops without speechSynthesis", () => {
    // jsdom has no speechSynthesis
    expect(() => speak("hello")).not.toThrow();
  });
});
