"use client";
import Button from "../ui/Button";
import { speak } from "@/lib/speech";
import type { Scene } from "@/content/types";
import type { GameState } from "@/lib/useGame";
import type { ChatEntry } from "../game/ChatThread";

export default function SummaryScreen({ state, chat, onReplay }:
  { scene: Scene; state: GameState; chat: ChatEntry[]; onReplay: () => void }) {
  return (
    <div className="mx-auto max-w-[520px] px-4 pt-6 pb-10 flex flex-col gap-4">
      <h2 className="font-display font-extrabold text-xl text-center">Xong buổi sáng 🎉</h2>
      <p className="text-sm text-ink-soft text-center">
        {state.bossCorrect === 3
          ? "Ba câu, đúng tông cả ba. Chiều nay gõ được liền."
          : "Hiểu nghĩa thì dễ, chọn đúng tông mới khó. Chơi lại thử coi."}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[["Điểm", String(state.score)], ["Đúng tông", `${state.bossCorrect}/3`], ["Combo", `${state.maxCombo}×`]].map(([k, v]) => (
          <div key={k} className="border-2 border-ink rounded-card bg-surface px-2 py-3 text-center">
            <p className="font-display font-extrabold text-xl">{v}</p>
            <p className="text-2xs text-ink-soft">{k}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-soft text-center">👆 Chạm tin nhắn của bạn để nghe lại</p>
      <div className="flex flex-col gap-2">
        {chat.map(e => e.kind === "them" ? (
          <div key={e.id} className="self-start max-w-[85%] border-2 border-ink rounded-card bg-surface px-3 py-2">
            <p className="font-display font-bold text-sm">{e.en}</p>
            {e.vi && <p className="text-xs text-ink-soft mt-0.5">{e.vi}</p>}
          </div>
        ) : (
          <button key={e.id} onClick={() => speak(e.en, { rate: 0.9 })}
            className="self-end max-w-[85%] text-left border-2 border-ink rounded-card bg-en text-white px-3 py-2 font-display font-bold text-sm">
            {e.en}
            {e.vi && <span className="block text-2xs italic font-normal text-white/75 mt-0.5">{e.vi}</span>}
          </button>
        ))}
      </div>
      <Button onClick={onReplay}>Chơi lại ↻</Button>
    </div>
  );
}
