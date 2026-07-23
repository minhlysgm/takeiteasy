"use client";
import { useCallback, useEffect, useState } from "react";
import type { Scene } from "@/content/types";
import * as storage from "./storage";

export type Screen = "name" | "intro" | "play" | "boss" | "summary";
export type GameState = {
  screen: Screen; name: string;
  lineIndex: number; bossIndex: number;
  score: number; bestScore: number;
  bossCorrect: number; maxCombo: number; combo: number;
};

export function initState(scene: Scene, storedName: string | null, storedBest: number): GameState {
  return {
    screen: storedName ? "intro" : "name",
    name: storedName ?? "bạn",
    lineIndex: 0, bossIndex: 0,
    score: 0, bestScore: storedBest,
    bossCorrect: 0, maxCombo: 0, combo: 0,
  };
}

export function applyName(s: GameState, raw: string): GameState {
  const name = raw.trim().slice(0, 14) || "bạn";
  storage.setName(name);
  return { ...s, name, screen: "intro" };
}

export function applyMatch(s: GameState): GameState {
  const combo = s.combo + 1;
  return { ...s, combo, score: s.score + 10 * combo, maxCombo: Math.max(s.maxCombo, combo) };
}
export function applyMiss(s: GameState): GameState { return { ...s, combo: 0 }; }

export function nextLine(s: GameState, scene: Scene): GameState {
  const next = s.lineIndex + 1;
  if (next >= scene.lines.length) return { ...s, screen: "boss", combo: 0 };
  return { ...s, lineIndex: next, combo: 0 };
}

export function answerBoss(s: GameState, correct: boolean): GameState {
  return correct ? { ...s, score: s.score + 50, bossCorrect: s.bossCorrect + 1 } : s;
}

export function nextBoss(s: GameState, scene: Scene): GameState {
  const next = s.bossIndex + 1;
  if (next >= scene.boss.length) {
    storage.setBestScore(s.score);
    storage.addCompleted(scene.id);
    return { ...s, screen: "summary", bestScore: Math.max(s.bestScore, s.score) };
  }
  return { ...s, bossIndex: next };
}

export function withName(text: string, name: string): string {
  return text.replace(/\{name\}/g, name);
}

export function useGame(scene: Scene) {
  const [state, setState] = useState<GameState>(() => initState(scene, null, 0));
  // Render a neutral shell until we've read localStorage on the client, so a
  // returning user never sees the NameScreen flash. Reading storage during the
  // first render would mismatch the server-rendered HTML (hydration error), so
  // it stays in an effect and `hydrated` gates the UI.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setState(initState(scene, storage.getName(), storage.getBestScore()));
    setHydrated(true);
  }, [scene]);

  return {
    state,
    hydrated,
    setName: useCallback((raw: string) => setState(s => applyName(s, raw)), []),
    exitToIntro: useCallback(() => setState(s => initState(scene, s.name, s.bestScore)), [scene]),
    startScene: useCallback(() => setState(s => ({ ...s, screen: "play" as Screen })), []),
    match: useCallback(() => setState(applyMatch), []),
    miss: useCallback(() => setState(applyMiss), []),
    advanceLine: useCallback(() => setState(s => nextLine(s, scene)), [scene]),
    answerBoss: useCallback((ok: boolean) => setState(s => answerBoss(s, ok)), []),
    advanceBoss: useCallback(() => setState(s => nextBoss(s, scene)), [scene]),
    replay: useCallback(() => setState(s => ({ ...initState(scene, s.name, Math.max(s.bestScore, s.score)), screen: "intro" as Screen })), [scene]),
  };
}
