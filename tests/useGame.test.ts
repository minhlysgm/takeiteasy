import { describe, it, expect, vi } from "vitest";
import * as g from "../lib/useGame";
import * as storage from "../lib/storage";
import scene from "../content/scenes/sep-hoi-task.json";
import type { Scene } from "../content/types";
const S = scene as Scene;

describe("useGame reducer", () => {
  it("initState uses stored name & best", () => {
    const s = g.initState(S, "Minh", 120);
    expect(s.screen).toBe("intro");
    expect(s.name).toBe("Minh");
    expect(s.bestScore).toBe(120);
  });
  it("initState with no stored name starts at name screen", () => {
    expect(g.initState(S, null, 0).screen).toBe("name");
  });
  it("applyName caps 14 chars and defaults empty to bạn", () => {
    expect(g.applyName(g.initState(S, null, 0), "  ").name).toBe("bạn");
    expect(g.applyName(g.initState(S, null, 0), "abcdefghijklmnopqrst").name).toHaveLength(14);
    expect(g.applyName(g.initState(S, null, 0), "Minh").screen).toBe("intro");
  });
  it("scores 10*combo per match and tracks maxCombo", () => {
    let s = g.initState(S, "Minh", 0);
    s = g.applyMatch(s); // combo1 -> +10
    s = g.applyMatch(s); // combo2 -> +20
    expect(s.score).toBe(30);
    expect(s.maxCombo).toBe(2);
    s = g.applyMiss(s);
    expect(s.combo).toBe(0);
    s = g.applyMatch(s); // combo1 -> +10
    expect(s.score).toBe(40);
    expect(s.maxCombo).toBe(2);
  });
  it("boss correct adds 50 and increments bossCorrect", () => {
    let s = g.initState(S, "Minh", 0);
    s = { ...s, screen: "boss" };
    s = g.answerBoss(s, true);
    s = g.answerBoss(s, false);
    expect(s.score).toBe(50);
    expect(s.bossCorrect).toBe(1);
  });
  it("withName substitutes display name", () => {
    expect(g.withName("{name} ơi task hôm qua tới đâu ời?", "Minh"))
      .toBe("Minh ơi task hôm qua tới đâu ời?");
  });
  it("nextLine after last line goes to boss", () => {
    let s = g.initState(S, "Minh", 0);
    s = { ...s, screen: "play", lineIndex: S.lines.length - 1 };
    expect(g.nextLine(s, S).screen).toBe("boss");
  });
  it("nextBoss on last question goes to summary and persists best score + completion", () => {
    const setBest = vi.spyOn(storage, "setBestScore");
    const addDone = vi.spyOn(storage, "addCompleted");
    let s = g.initState(S, "Minh", 0);
    s = { ...s, screen: "boss", bossIndex: S.boss.length - 1, score: 170 };
    const out = g.nextBoss(s, S);
    expect(out.screen).toBe("summary");
    expect(setBest).toHaveBeenCalledWith(170);
    expect(addDone).toHaveBeenCalledWith(S.id);
    setBest.mockRestore();
    addDone.mockRestore();
  });
  it("nextBoss before last question just advances bossIndex", () => {
    let s = g.initState(S, "Minh", 0);
    s = { ...s, screen: "boss", bossIndex: 0 };
    const out = g.nextBoss(s, S);
    expect(out.screen).toBe("boss");
    expect(out.bossIndex).toBe(1);
  });
});
