"use client";
import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import type { Scene } from "@/content/types";
import type { GameState } from "@/lib/useGame";

export default function BossScreen({ scene, state, onAnswer, onNext }:
  { scene: Scene; state: GameState; onAnswer: (ok: boolean) => void; onNext: () => void }) {
  const q = scene.boss[state.bossIndex];
  const opts = useMemo(() => [...q.opts].sort(() => Math.random() - 0.5), [state.bossIndex]); // shuffle once
  const [picked, setPicked] = useState<number | null>(null);
  // The orchestrator reuses this component across all 3 questions, so reset the
  // per-question pick when the question changes (otherwise later questions render
  // pre-locked/revealed with the previous pick).
  useEffect(() => { setPicked(null); }, [state.bossIndex]);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const chosen = opts[i];
    const correct = scene.boss[state.bossIndex].opts.find(o => o.ok)!;
    if (chosen.ok) { sfx.win(); speak(chosen.en, { rate: 1 }); onAnswer(true); }
    else { sfx.matchNo(); speak(correct.en, { rate: 1 }); onAnswer(false); }
  }

  return (
    <div className="mx-auto max-w-[520px] px-4 pt-6 pb-8 flex flex-col gap-4">
      <p className="text-2xs font-display text-ink-soft uppercase">Thử thách · {state.bossIndex + 1}/3</p>
      <h2 className="font-display font-bold text-lg">{q.q}</h2>
      <p className="text-xs text-ink-soft">Hai câu này cùng một nghĩa. Câu nào hợp hơn?</p>
      <div className="flex flex-col gap-3">
        {opts.map((o, i) => {
          const revealed = picked !== null;
          const border = !revealed ? "border-2 border-ink"
            : o.ok ? "border-2 border-ok"
            : i === picked ? "border-2 border-mastered"
            : "border-2 border-ink opacity-60";
          return (
            <div key={i}>
              <button onClick={() => pick(i)} disabled={revealed}
                className={`w-full text-left rounded-tile bg-surface px-3 py-3 font-display font-bold text-sm ${border}
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink`}>
                {o.en}
              </button>
              {revealed && (i === picked || o.ok) && (
                <p className="text-xs text-ink-soft mt-1 px-1">{o.why}</p>
              )}
            </div>
          );
        })}
      </div>
      {picked !== null && (
        <Button onClick={onNext}>{state.bossIndex === scene.boss.length - 1 ? "Xem kết quả ▸" : "Câu tiếp ▸"}</Button>
      )}
    </div>
  );
}
