import { describe, it, expect } from "vitest";
import scene from "../content/scenes/sep-hoi-task.json";
import type { Scene } from "../content/types";

const s = scene as Scene;

describe("scene content", () => {
  it("has 3 lines and 3 boss questions", () => {
    expect(s.lines).toHaveLength(3);
    expect(s.boss).toHaveLength(3);
  });
  it("keeps verbatim văn nói exactly", () => {
    expect(s.lines[0].them?.vi).toBe("{name} ơi task hôm qua tới đâu ời?");
    expect(s.lines[0].think).toBe("Dạ em vẫn đang làm anh ơi 😭, để em ráng xong sớm trong sáng nay ạ");
    expect(s.blurb).toContain("nổ rùm beng");
    expect(s.lines[0].variants[0].why).toContain("=))))");
  });
  it("each line has ≥2 chunks and each boss has exactly one ok:true", () => {
    for (const l of s.lines) expect(l.chunks.length).toBeGreaterThanOrEqual(2);
    for (const b of s.boss) expect(b.opts.filter(o => o.ok)).toHaveLength(1);
  });
});
