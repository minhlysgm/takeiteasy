import { describe, it, expect } from "vitest";
import { sfx, initAudio } from "../lib/sfx";

describe("sfx", () => {
  it("no-ops before init and never throws", () => {
    expect(() => sfx.click()).not.toThrow();
    expect(() => sfx.matchOk(3)).not.toThrow();
    expect(() => sfx.win()).not.toThrow();
  });
  it("initAudio no-ops without AudioContext", () => {
    expect(() => initAudio()).not.toThrow();
  });
});
