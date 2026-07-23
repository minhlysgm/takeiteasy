"use client";
type Props = {
  kind: "them" | "me"; en: string; vi?: string;
  seen?: boolean; think?: boolean; onSpeak?: () => void;
};
export default function Bubble({ kind, en, vi, seen, think, onSpeak }: Props) {
  if (think) {
    return (
      <div className="self-end max-w-[85%] border-2 border-dashed border-ink rounded-card px-3 py-2 italic text-sm text-ink"
        style={{ background: "rgba(255,208,41,0.18)" }}>
        <span className="text-2xs not-italic font-display text-ink-soft block mb-0.5">Bạn đang nghĩ</span>
        {en}
      </div>
    );
  }
  if (kind === "them") {
    return (
      <div className="self-start max-w-[85%] border-2 border-ink rounded-card bg-surface px-3 py-2">
        <p className="font-display font-bold text-sm text-ink">{en}</p>
        {vi && <p className="text-xs text-ink-soft mt-0.5">{vi}</p>}
      </div>
    );
  }
  return (
    <div className="self-end max-w-[85%] flex flex-col items-end animate-spring">
      <button onClick={onSpeak} className="text-left border-2 border-ink rounded-card bg-en text-white px-3 py-2 font-display font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">
        {en}
        {vi && <span className="block text-2xs italic font-normal text-white/75 mt-0.5">{vi}</span>}
      </button>
      {seen && <span className="text-2xs text-ink-soft mt-0.5">Đã xem</span>}
    </div>
  );
}
