"use client";
import { useSyncExternalStore } from "react";
import { DEFAULT_VOICE, isVoiceId, type VoiceId } from "./voices";

export const VOICE_KEY = "tie:voice";

const listeners = new Set<() => void>();

export function getVoice(): VoiceId {
  try {
    const raw = localStorage.getItem(VOICE_KEY);
    return isVoiceId(raw) ? raw : DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE; // localStorage bị chặn — dùng giọng mặc định
  }
}

export function setVoice(id: VoiceId): void {
  try {
    localStorage.setItem(VOICE_KEY, id);
  } catch {
    /* private mode: không lưu được thì thôi, app vẫn chạy */
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // tab khác đổi giọng
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === VOICE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// Server render luôn là "will"; trình duyệt đổi sang giọng đã lưu sau hydrate, không lệch hình.
export function useVoice(): VoiceId {
  return useSyncExternalStore(subscribe, getVoice, () => DEFAULT_VOICE);
}
