"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Composer from "../game/Composer";
import Bubble from "../game/Bubble";
import Chip from "../ui/Chip";
import Button from "../ui/Button";
import ComboBadge from "../effects/ComboBadge";
import Particles from "../effects/Particles";
import TypingIndicator from "../game/TypingIndicator";
import { buildTiles, resolveTap, type TileModel } from "@/lib/matching";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import { withName, type GameState } from "@/lib/useGame";
import type { Scene } from "@/content/types";
import type { ChatEntry } from "../game/ChatThread";

type Phase = "intro" | "think" | "play" | "sending" | "done";

export default function PlayScreen({
  scene, state, onMatch, onMiss, onAdvance, onExit, chat, pushChat, ChatSlot,
}: {
  scene: Scene; state: GameState;
  onMatch: () => void; onMiss: () => void; onAdvance: () => void; onExit: () => void;
  chat: ChatEntry[]; pushChat: (e: ChatEntry) => void; ChatSlot: React.ReactNode;
}) {
  const line = scene.lines[state.lineIndex];
  const [phase, setPhase] = useState<Phase>("intro");
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState("đang hoạt động");
  const [tiles, setTiles] = useState<TileModel[]>([]);
  const [filled, setFilled] = useState<boolean[]>(() => line.chunks.map(() => false));
  const [selected, setSelected] = useState<TileModel | null>(null);
  const [shaking, setShaking] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const [glowIndex, setGlowIndex] = useState<number | undefined>(undefined);
  const [burst, setBurst] = useState<{ x: number; y: number; color: string } | null>(null);
  const [variantOpen, setVariantOpen] = useState(false);
  const comboRef = useRef(state.combo);
  comboRef.current = state.combo;

  // all setTimeout ids currently pending, so we can wipe them on line-change/unmount
  const timersRef = useRef<number[]>([]);
  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // reset + run the scripted intro whenever the line changes
  useEffect(() => {
    clearTimers();
    setPhase("intro");
    setTyping(false);
    setFilled(line.chunks.map(() => false));
    setSelected(null);
    setLocked(true);
    setVariantOpen(false);
    setGlowIndex(undefined);
    setBurst(null);
    setShaking([]);
    setTiles(buildTiles(line.chunks));

    const startPlay = () => {
      setPhase("think");
      schedule(() => {
        setPhase("play");
        setLocked(false);
      }, 600);
    };

    if (line.them) {
      setStatus("đang soạn tin trên máy tính…");
      setTyping(true);
      schedule(() => {
        setTyping(false);
        setStatus("đang hoạt động");
        pushChat({
          id: `them-${state.lineIndex}`,
          kind: "them",
          en: withName(line.them!.en, state.name),
          vi: withName(line.them!.vi, state.name),
        });
        sfx.ping();
        speak(line.them!.en, { rate: 1 });
        schedule(startPlay, 900);
      }, 1500);
    } else {
      startPlay();
    }

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lineIndex]);

  const remaining = useMemo(() => tiles, [tiles]);

  function onTap(t: TileModel) {
    if (locked) return;
    const r = resolveTap(selected, t);
    if (r.kind === "select") {
      setSelected(t);
      sfx.click();
      return;
    }
    if (r.kind === "deselect") {
      setSelected(null);
      return;
    }
    if (r.kind === "reselect") {
      setSelected(t);
      sfx.click();
      return;
    }
    if (r.kind === "match") {
      setLocked(true);
      onMatch();
      sfx.matchOk(comboRef.current + 1);
      // Correction 1: speak the ENGLISH chunk explicitly — the tapped tile
      // may be the vi-side tile, so resolve which of the pair is the en side.
      const enText = t.side === "en" ? t.text : selected!.text;
      speak(enText, { rate: 1 });
      // Correction 2: burst color comes from the tile's own side color
      // (en/vi), never the mastered-yellow reserved for combo.
      const burstColor = t.side === "en" ? "#FF7A00" : "#00B2A9";
      const el = document.querySelector(`[data-key="${t.key}"]`) as HTMLElement | null;
      if (el) {
        const r2 = el.getBoundingClientRect();
        setBurst({ x: r2.left + r2.width / 2, y: r2.top + r2.height / 2, color: burstColor });
      }
      const id = t.chunkId;
      setTiles(prev => prev.filter(x => x.chunkId !== id));
      setFilled(prev => prev.map((f, i) => (i === id ? true : f)));
      setSelected(null);
      schedule(() => {
        setBurst(null);
        setLocked(false);
      }, 400);
    } else {
      setLocked(true);
      onMiss();
      sfx.matchNo();
      navigator.vibrate?.(60);
      setShaking([t.key, selected!.key]);
      schedule(() => {
        setShaking([]);
        setSelected(null);
        setLocked(false);
      }, 420);
    }
  }

  // trigger send once every chunk is filled
  useEffect(() => {
    if (phase === "play" && filled.length > 0 && filled.every(Boolean)) runSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled, phase]);

  function runSend() {
    setPhase("sending");
    speak(line.en, { rate: 0.9 });
    let acc = 0;
    line.chunks.forEach((c, i) => {
      const dur = Math.max(280, c.en.length * 28);
      schedule(() => setGlowIndex(i), acc);
      acc += dur;
    });
    schedule(() => {
      setGlowIndex(undefined);
      pushChat({
        id: `me-${state.lineIndex}`,
        kind: "me",
        en: line.en,
        seen: true,
        onSpeak: () => speak(line.en, { rate: 0.9 }),
      });
      sfx.send();
      setPhase("done");
    }, acc + 200);
  }

  const showBoard = phase === "play";
  const showComposer = phase === "play" || phase === "sending";

  return (
    <div className="mx-auto max-w-[520px] px-4 pb-8 flex flex-col gap-3">
      {/* top bar */}
      <div className="flex items-center gap-2 pt-3">
        <button onClick={onExit} aria-label="Thoát" className="text-lg font-display px-2">✕</button>
        <div className="w-9 h-9 rounded-full bg-sunken border-2 border-ink flex items-center justify-center">🧑‍💼</div>
        <div className="flex-1 leading-tight">
          <p className="font-display font-bold text-sm">Sếp</p>
          <p className="text-2xs text-ink-soft">{status}</p>
        </div>
        <Chip>Lượt {state.lineIndex + 1}/3</Chip>
        <Chip>Điểm {state.score}</Chip>
      </div>

      {line.sit !== "" && (
        <p className="italic text-xs text-ink-soft bg-sunken border-2 border-dashed border-ink rounded-card px-3 py-2">
          {line.sit}
        </p>
      )}

      {ChatSlot}
      {typing && <TypingIndicator />}
      {phase === "think" && <Bubble kind="them" en={line.think} think />}

      {showComposer && (
        <Composer
          chunks={line.chunks}
          filled={filled}
          label={phase === "sending" ? "Đang gửi…" : "Soạn tin"}
          glowIndex={glowIndex}
        />
      )}
      {showBoard && (
        <div className="grid grid-cols-2 gap-2.5">
          {remaining.map(t => (
            <button
              key={t.key}
              data-key={t.key}
              onClick={() => onTap(t)}
              disabled={locked}
              className={`relative ${t.side === "en" ? "bg-en" : "bg-vi"} text-white border-2 border-ink rounded-tile px-2.5 pt-4 pb-2 min-h-[56px] text-sm font-display font-bold leading-tight
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink
                ${selected?.key === t.key ? "scale-105 ring-2 ring-ink brightness-110" : ""}`}
              style={shaking.includes(t.key) ? { animation: "shake .42s" } : undefined}
            >
              <span className="absolute top-1 left-2 text-[9px] uppercase opacity-80 tracking-wide">{t.side}</span>
              {t.text}
            </button>
          ))}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-3">
          <div className="border-l-4 border-ink rounded-card px-3 py-2 text-sm" style={{ background: "rgba(0,178,169,0.12)" }}>
            <span className="mr-1">🏷️</span>
            {line.tone}
          </div>
          {line.variants.length > 0 && (
            <div className="border-2 border-ink rounded-card bg-surface">
              <button
                onClick={() => setVariantOpen(o => !o)}
                className="w-full text-left px-3 py-2 font-display font-bold text-sm"
              >
                💬 Hoặc người bản xứ còn nói {variantOpen ? "▾" : "▸"}
              </button>
              {variantOpen && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {line.variants.map((v, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <button
                        onClick={() => speak(v.en, { rate: 1 })}
                        className="text-left border-2 border-ink rounded-tile bg-en text-white px-2.5 py-1.5 text-sm font-display font-bold"
                      >
                        🔊 {v.en}
                      </button>
                      <p className="text-xs text-ink-soft">{v.why}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 items-stretch">
            <Button onClick={onAdvance}>
              {state.lineIndex === scene.lines.length - 1 ? "Thử thách cuối ▸" : "Tin tiếp theo ▸"}
            </Button>
            <Button variant="secondary" onClick={() => speak(line.en, { rate: 0.9 })}>
              🔊 Nghe lại
            </Button>
          </div>
        </div>
      )}

      {state.combo >= 2 && showBoard && <ComboBadge combo={state.combo} />}
      {burst && <Particles x={burst.x} y={burst.y} color={burst.color} />}
    </div>
  );
}
