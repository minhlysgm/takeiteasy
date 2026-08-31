import { beforeEach, describe, expect, it } from "vitest";
import { isHintSeen, markHintSeen } from "@/lib/hints";

describe("hints", () => {
  beforeEach(() => localStorage.clear());

  it("chưa xem thì false, mark xong thì true", () => {
    expect(isHintSeen("reader")).toBe(false);
    markHintSeen("reader");
    expect(isHintSeen("reader")).toBe(true);
  });

  it("các hint độc lập nhau", () => {
    markHintSeen("reader");
    expect(isHintSeen("hint-khac")).toBe(false);
  });
});
