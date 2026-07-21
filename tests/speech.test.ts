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
  it("preserves a legitimate leading dash/comma when no {name} present", () => {
    expect(stripName("— Let us begin the standup now.")).toBe("— Let us begin the standup now.");
    expect(stripName(", starting off strangely.")).toBe(", starting off strangely.");
  });
  it("still strips leading comma left by a removed {name}", () => {
    expect(stripName("{name}, where are we on yesterday's task?")).toBe("where are we on yesterday's task?");
  });
});
