"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { audioPath } from "@/lib/audio/audioPath";
import { stopPlayback, togglePlay, usePlaying } from "@/lib/audio/player";
import { setVoice, useVoice } from "@/lib/audio/voicePref";
import { DEFAULT_VOICE, VOICES, voiceName, type VoiceId } from "@/lib/audio/voices";
import { useSheetBehavior } from "@/lib/useSheetBehavior";
import { useCloseOnFocusOut } from "@/lib/useCloseOnFocusOut";
import { Glyph } from "./Glyph";

interface Props {
  /**
   * how: đóng bằng chuột/chạm ("pointer"), phím ("key"), hay vì focus đã rời ô chọn ("focus-out", desktop)
   * — để màn đọc quyết định trả focus về đâu.
   */
  onClose: (how: "key" | "pointer" | "focus-out") => void;
  /** Lúc đóng: focus vào phần tử trả về (không cuộn), null = để focus yên. Mặc định: về chỗ cũ. */
  restoreFocus?: () => HTMLElement | null;
}

/**
 * Chỗ chọn giọng đọc. Mobile: tấm trượt từ dưới (như danh sách thẻ). Desktop (lg): ô nổi ngay dưới nút ở góc
 * phải header, không làm mờ trang. Bấm dòng = chọn (ô vẫn mở để so tiếp); "▶ thử" = nghe câu mẫu, không đổi giọng.
 */
export function VoicePicker({ onClose, restoreFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const voice = useVoice();
  const playing = usePlaying();
  const sheet = useSheetBehavior(ref, {
    initialFocus: () => ref.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ?? null,
    restoreFocus,
  });

  // Đổi giọng thì dừng mọi thứ đang phát (kể cả câu nghe thử). Chọn lại giọng đang dùng: không làm gì.
  const pick = (id: VoiceId) => {
    if (id === voice) return;
    setVoice(id);
    stopPlayback();
  };

  // Đóng ô chọn thì dừng câu nghe thử đang phát (như đóng drawer dừng câu ví dụ).
  useEffect(() => () => stopPlayback("sample:"), []);

  // Desktop: focus rơi ra ngoài ô (Tab ra) thì đóng, để focus yên chỗ vừa tới
  useCloseOnFocusOut(ref, () => onClose("focus-out"));

  // Mount ngoài màn hình rồi flip ở frame kế để transition chạy (giống PassageJumpList)
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    sheet.onKeyDown(e);
    if (e.key === "Escape") {
      e.preventDefault(); // màn đọc thấy defaultPrevented thì không đóng lần nữa
      onClose("key");
      return;
    }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    // Nhóm radio: ↓/→ giọng kế, ↑/← giọng trước (vòng tròn), focus vào nó. Không tự phát câu nghe thử.
    const rows = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    const to = (at + step + rows.length) % rows.length;
    pick(VOICES[to].id);
    rows[to].focus();
  };

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="voice-backdrop"
        onClick={() => onClose("pointer")}
        className={`fixed inset-0 z-30 bg-scrim transition-opacity duration-300 ease-out motion-reduce:transition-none lg:bg-transparent ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-label="giọng đọc"
        data-testid="voice-picker"
        // Ô vẫn mở sau khi bấm: giữ focus ở nút vừa bấm để ↑/↓, Esc, Tab dùng tiếp được
        data-keep-focus=""
        onKeyDown={onKeyDown}
        className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none lg:inset-x-auto lg:bottom-auto lg:right-5 lg:top-12 lg:max-h-[calc(100dvh-7rem)] lg:w-[380px] lg:rounded-lg lg:border lg:transition-none ${entered ? "translate-y-0" : "translate-y-full lg:translate-y-0"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-1.5 pl-5 pr-1">
          <div className="min-w-0 truncate text-[13.5px] text-bright">
            giọng đọc
            <span className="ml-2 text-xs text-muted">đang dùng: {voiceName(voice)}</span>
          </div>
          <button
            type="button"
            onClick={(e) => onClose(e.detail === 0 ? "key" : "pointer")}
            aria-label="đóng"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-text hover:text-bright focus-visible:outline-offset-[-8px]"
          >
            <span className="text-[18px] leading-none">✕</span>
          </button>
        </div>

        <div role="radiogroup" aria-label="giọng đọc" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5">
          {VOICES.map((v) => {
            const selected = v.id === voice;
            const sampleKey = `sample:${v.id}`;
            const sampling = playing === sampleKey;
            return (
              // Focus bàn phím vào nút chọn → viền bao cả dòng (cả nút "thử"), không chẻ đôi dòng
              <div
                key={v.id}
                className={`flex min-h-[52px] items-center outline-offset-[-2px] has-[[role=radio]:focus-visible]:outline has-[[role=radio]:focus-visible]:outline-2 has-[[role=radio]:focus-visible]:outline-[var(--focus)] ${selected ? "bg-accent-soft" : ""}`}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={(e) => {
                    e.currentTarget.focus(); // Safari không focus nút khi bấm chuột → ↑/↓ sau đó không chạy
                    pick(v.id);
                  }}
                  className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-1.5 pl-5 text-left focus-visible:outline-none"
                >
                  <span aria-hidden="true" className="w-3.5 shrink-0 text-accent-strong">
                    {selected ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className="text-[14px] text-bright">{v.name}</span>
                    {v.id === DEFAULT_VOICE && <span className="ml-1.5 text-[11px] text-accent-strong"> mặc định</span>}
                    {/* dòng đang chọn: muted trên accent-soft chỉ ~4.1:1 → dùng text (như danh sách thẻ) */}
                    <span className={`block text-xs ${selected ? "text-text" : "text-muted"}`}> {v.desc}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`nghe thử ${v.name}`}
                  onClick={() => togglePlay(sampleKey, { text: v.sample, src: audioPath(v.id, v.sample) })}
                  // bề rộng đủ cho "■ dừng" để chữ không nhảy khi bật/tắt
                  className="mr-2 flex h-11 min-w-[calc(6ch+1.25rem)] shrink-0 items-center justify-center whitespace-nowrap px-2.5 text-[12.5px] text-accent-strong transition-colors motion-reduce:transition-none hover:text-bright focus-visible:outline-offset-[-4px]"
                >
                  {/* bọc span: trong flex, khoảng trắng đứng đầu nhãn bị nuốt */}
                  <span>
                    <Glyph>{sampling ? "■" : "▶"}</Glyph> {sampling ? "dừng" : "thử"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-line px-5 py-2 text-[11.5px] text-muted">
          giọng AI tạo sẵn · chữ bôi đen và từ tra vẫn dùng giọng của máy
        </div>
      </div>
    </>
  );
}
