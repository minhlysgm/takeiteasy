"use client";
import { useSyncExternalStore } from "react";
import { DEFAULT_VOICE, isVoiceId, type VoiceId } from "./voices";

export const VOICE_KEY = "tie:voice";

const listeners = new Set<() => void>();
/** Giọng vừa chọn mà không ghi được vào localStorage (chặn / đầy) — nhớ tạm trong phiên. */
let unsaved: VoiceId | null = null;

export function getVoice(): VoiceId {
  if (unsaved) return unsaved;
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
    unsaved = null;
  } catch {
    unsaved = id; // private mode / đầy: không lưu được thì nhớ tạm, vẫn đúng tới khi tải lại trang
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // tab khác đổi giọng
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== VOICE_KEY) return;
    unsaved = null; // tab khác ghi được → theo giá trị đã lưu
    onChange();
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
