"use client";
import { useSyncExternalStore } from "react";
import { isSpeechAvailable, speak, stopSpeech } from "@/lib/speech";

// Một bộ phát duy nhất: một lúc chỉ có một thứ phát (file mp3 hoặc giọng trình duyệt).
// Mỗi lượt có số thứ tự `seq`; sự kiện / promise của lượt đã bị thay bị bỏ qua.

let playing: string | null = null;
let seq = 0;
let fellBack = false; // lượt hiện tại đã chuyển sang giọng trình duyệt chưa (chỉ 1 lần)
let audio: HTMLAudioElement | null = null; // tạo lười: import lúc SSR không đụng Audio

const listeners = new Set<() => void>();

function setPlaying(key: string | null): void {
  if (playing === key) return;
  playing = key;
  listeners.forEach((l) => l());
}

function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
}

function detachAudio(): void {
  if (!audio) return;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
}

/** Kết thúc lượt hiện tại: tăng seq để mọi sự kiện đến muộn của nó bị bỏ qua. */
function halt(): void {
  seq += 1;
  detachAudio();
  stopSpeech();
}

function fallbackToSpeech(turn: number, text: string): void {
  if (turn !== seq || fellBack) return;
  fellBack = true;
  detachAudio();
  if (!isSpeechAvailable()) {
    setPlaying(null); // không còn đường nào để đọc → nút về "đọc to"
    return;
  }
  speak(text, {
    onEnd: () => {
      if (turn === seq) setPlaying(null);
    },
  });
}

export function play(key: string, opts: { text: string; src?: string }): void {
  halt();
  const turn = seq;
  fellBack = false;
  setPlaying(key);

  if (!opts.src) {
    fallbackToSpeech(turn, opts.text);
    return;
  }

  const a = getAudio();
  a.onended = () => {
    if (turn === seq) setPlaying(null);
  };
  a.onerror = () => fallbackToSpeech(turn, opts.text);
  a.src = opts.src;
  try {
    // play() có thể trả undefined ở trình duyệt cũ
    void Promise.resolve(a.play()).catch(() => fallbackToSpeech(turn, opts.text));
  } catch {
    fallbackToSpeech(turn, opts.text);
  }
}

export function togglePlay(key: string, opts: { text: string; src?: string }): void {
  if (playing === key) stopPlayback();
  else play(key, opts);
}

export function stopPlayback(prefix?: string): void {
  if (prefix !== undefined && !(playing !== null && playing.startsWith(prefix))) return;
  halt();
  setPlaying(null);
}

export function getPlaying(): string | null {
  return playing;
}

export function subscribePlaying(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function usePlaying(): string | null {
  return useSyncExternalStore(subscribePlaying, getPlaying, () => null);
}
