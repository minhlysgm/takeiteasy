"use client";
import Button from "../ui/Button";
import { initVoices } from "@/lib/speech";
import { initAudio } from "@/lib/sfx";
import type { Scene } from "@/content/types";
export default function IntroScreen({ scene, onOpen }: { scene: Scene; onOpen: () => void }) {
  const open = () => { initAudio(); initVoices(); onOpen(); };
  return (
    <div className="flex flex-col items-center gap-4 pt-16 px-6 text-center">
      <div className="text-6xl">{scene.icon}</div>
      <h2 className="font-display font-extrabold text-xl">{scene.title}</h2>
      <p className="italic text-sm text-ink-soft max-w-[320px]">{scene.blurb}</p>
      <Button onClick={open}>Mở Zalo ▸</Button>
    </div>
  );
}
