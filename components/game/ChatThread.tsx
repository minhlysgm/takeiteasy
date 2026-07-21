"use client";
import { useEffect, useRef } from "react";
import Bubble from "./Bubble";
export type ChatEntry = { id: string; kind: "them" | "me"; en: string; vi?: string; seen?: boolean; onSpeak?: () => void };
export default function ChatThread({ entries }: { entries: ChatEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);
  return (
    <div ref={ref} className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "34vh" }}>
      {entries.map(e => (
        <Bubble key={e.id} kind={e.kind} en={e.en} vi={e.vi} seen={e.seen} onSpeak={e.onSpeak} />
      ))}
    </div>
  );
}
