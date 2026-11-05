"use client";
import { useEffect, useState } from "react";
import { isHintSeen, markHintSeen } from "@/lib/hints";

const HINT_ID = "reader";

/** Dải mẹo một-lần cho người mới: hiện đến khi bấm "đã hiểu" hoặc tự khám phá ra explain mode. */
export function FirstTimeHint({ explainOn }: { explainOn: boolean }) {
  // Đọc localStorage sau mount để SSR và client render lần đầu khớp nhau.
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!isHintSeen(HINT_ID));
  }, []);

  useEffect(() => {
    if (explainOn) {
      markHintSeen(HINT_ID);
      setShow(false);
    }
  }, [explainOn]);

  if (!show) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-line bg-surface px-4 py-2.5 lg:px-8 text-[13px]">
      <span className="text-ink">
        <span className="lg:hidden">{'// mẹo: chạm "giải thích" để xem các cụm đáng học'}</span>
        <span className="hidden lg:inline">
          {'// mẹo: bấm nút "giải thích" để xem các cụm đáng học được gạch chân và phân tích — tô đen cụm bất kỳ trong nguyên văn để nghe phát âm'}
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          markHintSeen(HINT_ID);
          setShow(false);
        }}
        className="-my-3 -mr-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center px-2 text-muted transition-colors hover:text-bright"
      >
        đã hiểu
      </button>
    </div>
  );
}
