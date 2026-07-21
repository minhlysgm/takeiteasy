"use client";
import { useCallback, useState } from "react";
import scene from "@/content/scenes/sep-hoi-task.json";
import type { Scene } from "@/content/types";
import { useGame } from "@/lib/useGame";
import NameScreen from "@/components/screens/NameScreen";
import IntroScreen from "@/components/screens/IntroScreen";
import PlayScreen from "@/components/screens/PlayScreen";
import BossScreen from "@/components/screens/BossScreen";
import SummaryScreen from "@/components/screens/SummaryScreen";
import ChatThread, { type ChatEntry } from "@/components/game/ChatThread";

const S = scene as Scene;

export default function Page() {
  const g = useGame(S);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const pushChat = useCallback(
    (e: ChatEntry) => setChat(prev => (prev.some(x => x.id === e.id) ? prev : [...prev, e])),
    []
  );
  const resetChat = useCallback(() => setChat([]), []);

  switch (g.state.screen) {
    case "name":
      return <NameScreen onSubmit={g.setName} />;
    case "intro":
      return <IntroScreen scene={S} onOpen={() => { resetChat(); g.startScene(); }} />;
    case "play":
      return (
        <PlayScreen
          scene={S}
          state={g.state}
          onMatch={g.match}
          onMiss={g.miss}
          onAdvance={g.advanceLine}
          onExit={() => { resetChat(); location.reload(); }}
          chat={chat}
          pushChat={pushChat}
          ChatSlot={<ChatThread entries={chat} />}
        />
      );
    case "boss":
      return <BossScreen scene={S} state={g.state} onAnswer={g.answerBoss} onNext={g.advanceBoss} />;
    case "summary":
      return (
        <SummaryScreen
          scene={S}
          state={g.state}
          chat={chat}
          onReplay={() => { resetChat(); g.replay(); }}
        />
      );
  }
}
